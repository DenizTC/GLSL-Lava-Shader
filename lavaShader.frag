#version 430

in vec3 fPosition;
in mat3 fTBN;
in vec3 fNormal;
in vec2 fTexcoord;

uniform vec4 uLightPosition;
uniform vec3 uEyePos;

uniform vec4 uTileAmount;
uniform vec3 uOutlineColor;
uniform vec3 uKa;
uniform vec3 uKd;
uniform vec3 uKs;
uniform vec3 uLa;
uniform vec3 uLd;
uniform vec3 uLs;
uniform float uLavaOffset;
uniform float uShininess;
uniform float uParallaxScale;
uniform float uWave;
uniform float uLavaWave;
uniform sampler2D diff;
uniform sampler2D spec;
uniform sampler2D glow;
uniform sampler2D ddn;
uniform sampler2D height;
uniform sampler2D diffLava;
uniform sampler2D specLava;
uniform sampler2D ddnLava;
uniform sampler2D heightLava;
uniform sampler2D heightWave;
uniform vec3 uLightDir;

uniform bvec2 uUseNormalPOM;
uniform bool uDrawScreenBillboard;

subroutine vec4 RenderPassType();
subroutine uniform RenderPassType RenderPass;

vec3 directionalLight(vec3 diffT, vec3 specT, vec3 ddnT)
{
	vec3 LightDir = normalize(fTBN*vec3(uLightPosition.x,uLightPosition.y, uLightPosition.z + 0.0001));
	vec3 EyeDir = fTBN*normalize(-fPosition);

	vec3 r = reflect(-LightDir,ddnT);
	float sDotN = max(dot(LightDir, ddnT), 0.0);
	
	vec3 ambient = uLa*uKa;
	vec3 diffuse = uLd*uKd*diffT*sDotN;
	vec3 specular = uLs*uKs*pow(max(dot(r,EyeDir),0.0),uShininess)*specT;

	return ambient + (diffuse + specular);
}

vec3 pointLight(vec3 diffT, vec3 specT, vec3 ddnT)
{
	vec3 LightDir = normalize(fTBN*(vec3(uLightPosition) - fPosition));
	vec3 EyeDir = fTBN*normalize(-fPosition);

	vec3 r = reflect(-LightDir,ddnT);
	float sDotN = max(dot(LightDir, ddnT), 0.0);
	
	vec3 ambient = uLa*uKa;
	vec3 diffuse = uLd*uKd*diffT*sDotN;
	vec3 specular = uLs*uKs*pow(max(dot(r,EyeDir),0.0),uShininess)*specT;

	return ambient + (diffuse + specular);
}

vec2 reliefParallaxMapping(in vec3 V, in vec2 T, out float parallaxHeight, int heigthIndex)
{
	float pomStrength = (heigthIndex == 0) ?
	uParallaxScale: 
	0.04 * uLavaWave + 0.4*texture2D(heightWave, fTexcoord + 8*uLavaOffset).r;

   // determine number of layers from angle between V and N
   const float minLayers = 50;
   const float maxLayers = 100;
   float numLayers = mix(maxLayers, minLayers, abs(dot(vec3(0, 0, 1), V)));

   // height of each layer
   float layerHeight = 1.0 / numLayers;
   // depth of current layer
   float currentLayerHeight = 0;
   // shift of texture coordinates for each iteration
   vec2 dtex = pomStrength * V.xy / V.z / numLayers;

   // current texture coordinates
   vec2 currentTextureCoords = T;

   // get first depth from heightmap
   float heightFromTexture = (heigthIndex == 0) ? 
   1.0 - texture2D(height, currentTextureCoords).r :
   1.0 - texture2D(heightLava, currentTextureCoords).r;

   // while point is above surface
   while(heightFromTexture > currentLayerHeight) 
   {
      // to the next layer
      currentLayerHeight += layerHeight;
      // shift texture coordinates along vector V
      currentTextureCoords -= dtex;
      // get new depth from heightmap
	  heightFromTexture = (heigthIndex == 0) ? 
	  1.0 - texture2D(height, currentTextureCoords).r :
	  1.0 - texture2D(heightLava, currentTextureCoords).r;
   }

   parallaxHeight = currentLayerHeight;
   return currentTextureCoords;
}

float random(vec3 scale, float seed, vec3 uv)
{
	return fract(sin(dot(vec3(uv.x,uv.y,uv.z)+seed,scale))*43758.5453+seed);
}

subroutine(RenderPassType)
vec4 RenderToTexture()
{
	float pomBias = 0.05;
		
	vec3 EyeDir = fTBN*normalize(-fPosition);
	vec3 LightDir = normalize(fTBN*(vec3(uLightPosition) - fPosition));
	
	float parallaxHeight;
	vec2 parallaxCoords, parallaxCoordsLava;
	
	if(!uUseNormalPOM.y)
	{
		parallaxCoords = fTexcoord + uLavaOffset; // no pom
		parallaxCoordsLava = fTexcoord + uLavaOffset;
	}
	else
	{
		parallaxCoords = reliefParallaxMapping(EyeDir,fTexcoord.st * uTileAmount.w + uLavaOffset / 2.0, parallaxHeight, 0);
		parallaxCoordsLava = reliefParallaxMapping(EyeDir,fTexcoord.st + uLavaOffset, parallaxHeight, 1);
	}

	float lavaHeight = texture2D(height, parallaxCoords).r;
	vec3 diffC = texture2D(diff, parallaxCoords * uTileAmount.x).rgb;
	vec3 specC = texture2D(spec, parallaxCoords * uTileAmount.y).rgb;
	vec3 diffLC = texture2D(diffLava, parallaxCoordsLava * uTileAmount.x).rgb;
	vec3 specLC = texture2D(specLava, parallaxCoordsLava * uTileAmount.y).rgb;
	vec3 glowC = texture2D(glow, parallaxCoordsLava * uTileAmount.y).rgb;
	vec3 ddnC, ddnLC;
	
	if(!uUseNormalPOM.x)
	{
		ddnC = 2.0 * vec3(0.5,0.5,1.0) - 1.0;
		ddnLC = ddnC;
	}
	else
	{
		ddnC = 2.0*texture2D(ddn, vec2(parallaxCoords.s, 1.0 + parallaxCoords.t) * uTileAmount.z).rgb - 1.0; // normal mapping
		ddnLC = 2.0*texture2D(ddnLava, vec2(parallaxCoordsLava.s, 1.0 + parallaxCoordsLava.t) * uTileAmount.z).rgb - 1.0; // normal mapping
	}
	
	//lavaHeight -= texture2D(heightWave, vec2(fTexcoord.x + 3*uLavaOffset, fTexcoord.y) * 2).r;
	gl_FragData[1] = vec4(glowC.x,glowC.y,glowC.z,1.0);		// glow
	gl_FragData[2] = vec4(1.0,1.0,1.0,1.0);					// alpha
	gl_FragData[3] = vec4(directionalLight(diffLC,specLC,ddnLC),1.0); // lava
	//gl_FragData[4] = vec4(temp,1.0); 
	gl_FragData[4] = vec4(lavaHeight, lavaHeight, lavaHeight,1.0); // lavaHeight
	return vec4(pointLight(diffC * (1.75 - uWave) ,specC,ddnC),1.0);
}

subroutine(RenderPassType)
vec4 RenderOutline()
{

	vec4 color = texture2D(diff, vec2(fTexcoord.x, 1.0 - fTexcoord.y));
	vec3 lava = texture2D(spec, vec2(fTexcoord.x, 1.0 - fTexcoord.y)).xyz;
	vec3 glowBlurred = texture2D(glow, vec2(fTexcoord.x, 1.0 - fTexcoord.y)).xyz;
	vec3 lavaHeight = texture2D(height, vec2(fTexcoord.x, 1.0 - fTexcoord.y)).xyz;

	lavaHeight = lavaHeight * uWave;
	//color.rgb *= 2 - uWave;
	//color.rgb += 2.5*glowBlurred * (1 - clamp(lavaHeight.r * lavaHeight.r, 0, 1));
	//vec3 cOut = mix(color.rgb, lava.rgb, 1.0 - lavaHeight);
	vec3 cOut = (lavaHeight.r > 0.45) ? 
	color.rgb : lava.rgb;
	
	if(color.a > 0.1 && uOutlineColor.y > 0)
	{
		int thickness = 10;
		float alpha;
		
		for (int i = -thickness; i < thickness; i++)
		{
			for (int j = -thickness; j < thickness; j++)
			{
				//alpha = texelFetchOffset(diff, curPixel, 0, ivec2(i, j)).a;
				alpha = texture2D(diff, vec2(fTexcoord.x, 1.0 - fTexcoord.y) + vec2(i/512.0, j/512.0)).a;
				if (alpha <=0.5)
					cOut = vec3(uOutlineColor.x, uOutlineColor.y, uOutlineColor.z);
			}
		}
	}
	
	cOut.rgb += 2.5*glowBlurred * (1 - clamp(lavaHeight.r * lavaHeight.r + 0.25, 0, 1));
	//color.rgb = vec3(lavaHeight,lavaHeight,lavaHeight);
	return vec4(cOut.rgb,1.0);
}

subroutine(RenderPassType)
vec4 RenderVBlur()
{
	ivec2 curPixel = ivec2(gl_FragCoord.xy);

	vec4 sum = vec4(0,0,0,0);
	float total = 0.0;
	float offset = random(vec3(12.9898,78.233,151.7182),0.0,vec3(curPixel.x,curPixel.y,0));
	for(float t=-30.0;t<=30.0;t++)
	{
		float percent=(t+offset-0.5)/30.0;
		float weight=1.0-abs(percent);
		sum += texture2D(diff, fTexcoord + vec2(0, 6) / 100.0 * percent) * weight;
		total += weight;
	}
	sum = sum / total;
	
	return sum;
}

subroutine(RenderPassType)
vec4 RenderHBlur()
{
	ivec2 curPixel = ivec2(gl_FragCoord.xy);
	
	vec4 sum = vec4(0,0,0,0);
	float total = 0.0;
	float offset = random(vec3(12.9898,78.233,151.7182),0.0,vec3(curPixel.x,curPixel.y,0));
	for(float t=-30.0;t<=30.0;t++)
	{
		float percent=(t+offset-0.5)/30.0;
		float weight=1.0-abs(percent);
		sum += texture2D(diff, fTexcoord + vec2(6, 0) / 100.0 * percent) * weight;
		total += weight;
	}
	sum = sum / total;
	
	return sum;
}

subroutine(RenderPassType)
vec4 RenderToScreen()
{
	return vec4(texture2D(diff, vec2(fTexcoord.x, 1.0 - fTexcoord.y)).rgb,1.0);
}

void main() {
	
	vec4 cout = RenderPass();
	gl_FragData[0] = cout;
}

