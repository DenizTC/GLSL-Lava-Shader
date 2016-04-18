# GLSL Lava Shader

This is a lava effect I created using two groups of textures, one for the lava and another for the rocks. In addition, when the cursor is over the object an outline is drawn.

![Lava shader](http://www.develteam.com/userdata/media/1618_2931_Lava-Effect.jpg)

### Pass 1 (Render to Texture)

This pass outputs 5 textures, the lavas glow texture, the alpha texture, the ads shading using the lava textures (diffuse, spec, normal, height), the ads shading using the rock textures (diffuse, spec, normal, height), and the height of the lava wave.

The height of the lava wave is the height of the rock texture, which will be used in the last pass to mask certain parts of the lava to reveal the rocks.

The diffuse of the ads rock output increases and decreases depending on the height of the lava. The higher the lava, the more intense the diffuse component and the lower the lava, the less intense the diffuse component is. This is just to fake the effect that the scene gets brighter when more lava is exposed.

The alpha texture simply sets the output to 1. This is used when outlining the object.

### Pass 2 (Horizontally blur the glow effect)

The glow texture mapped to the object that was rendered in pass1 is horizontally blurred.

### Pass 3 (Vertically blur the glow effect)

The texture from pass2 is vertically blurred.

### Pass4 (Outline and render to screen)

The output color depends on the height of the lava. To give the illusion that the lava`s height is fluctuating, it is multiplied by a value computed from a sinusoidal wave function.

The glow color from pass4 is added to the output color.

Finally the outline is computed using the alpha texture rendered in pass1. This is done by checking the alpha of all the neighbours of the current pixel, and if it is transparent (does not equal 1) then the output color is replaced by the outline color. The thickness of the outline effect depends on the number of neighbour pixels checked.

### Resources

The relief mapping effect is modified from the existing one here: 
http://sunandblackcat.com/tipFullView.php?topicid=28

The supplied textures are my own creation, and can be used freely with no restrictions.
