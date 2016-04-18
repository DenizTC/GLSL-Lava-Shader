#version 430

in vec3 VertexPosition;
in vec2 VertexTexcoord;
in vec3 VertexNormal;
in vec3 VertexTangent;

out vec3 fNormal;
out vec3 fPosition;
out vec2 fTexcoord;
out mat3 fTBN;

uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uNormalMatrix;
uniform mat4 uProjectionMatrix;


void main() 
{

	vec3 n = normalize(uNormalMatrix * vec4(VertexNormal,0.0)).xyz; 	//normal
	vec3 t = normalize(uNormalMatrix * vec4(VertexTangent,0.0)).xyz;	//tangent
	
	t = normalize(t - dot(t,n)*n);
		
	//bitangent calculated on the gpu
	vec3 b = normalize(cross(n, t));			
					
	if (dot(cross(n, t), b) < 0.0f) // check handedness
		t = t * -1.0f;
	
	
	
	fTBN = mat3(t.x,b.x,n.x,
				t.y,b.y,n.y,
				t.z,b.z,n.z);
	
	fNormal = n;
	fTexcoord = VertexTexcoord;
	fPosition = (uViewMatrix*uModelMatrix*vec4(VertexPosition,1.0)).xyz;
	gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(VertexPosition, 1);

}
