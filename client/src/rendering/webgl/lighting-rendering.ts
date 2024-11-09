import { Settings } from "battletribes-shared/settings";
import { lerp, Point, randFloat, randSign } from "battletribes-shared/utils";
import { createTexture, createWebGLProgram, gl, windowHeight, windowWidth } from "../../webgl";
import Board from "../../Board";
import OPTIONS from "../../options";
import { getLightPositionMatrix } from "../../lights";
import { bindUBOToProgram, UBOBindingIndex } from "../ubos";
import Layer, { getTileIndexIncludingEdges } from "../../Layer";
import { surfaceLayer } from "../../world";
import Camera from "../../Camera";
import { TileType } from "../../../../shared/src/tiles";

const enum Vars {
   MAX_LIGHTS = 64,
   DROPDOWN_LIGHT_STRENGTH = 6,

   /** The half-width and half-height of the area the distortion triangles occupy */
   DISTORTION_TRIANGLE_VISIBLE_AREA = 2500,
   DISTORTION_TRIANGLE_SPAWN_DIST = 1.1,
   DISTORTION_TRIANGLE_TELEPORT_DIST = 1.3,
   DISTORTION_TRIANGLE_MAX_SIZE = 800
}

interface RectLight {
   readonly x: number;
   readonly y: number;
   readonly width: number;
   readonly height: number;
}

interface DistortionTriangle {
   x1: number;
   y1: number;
   x2: number;
   y2: number;
   x3: number;
   y3: number;
   vx: number;
   vy: number;
   readonly r: number;
   readonly g: number;
   readonly b: number;
   readonly a: number;
}

const NIGHT_LIGHT = 0.4;

let darknessProgram: WebGLProgram;

let darknessFramebufferProgram: WebGLProgram;
let darknessFramebuffer: WebGLFramebuffer;
let darknessFramebufferTexture: WebGLTexture;
let darknessFramebufferVertexData: Float32Array;
let lastTextureWidth = 0;
let lastTextureHeight = 0;

let colourProgram: WebGLProgram;
let darknessVAO: WebGLVertexArrayObject;

let darkenFactorUniformLocation: WebGLUniformLocation;

const distortionTriangles = new Array<DistortionTriangle>();

let distortionProgram: WebGLProgram;

const generateDistortionTriangleSpawnPosition = (): Point => {
   let x = Camera.position.x;
   let y = Camera.position.y;

   const spawnOffset = Vars.DISTORTION_TRIANGLE_VISIBLE_AREA * Vars.DISTORTION_TRIANGLE_SPAWN_DIST;
   x += spawnOffset * randFloat(-1, 1);
   y += spawnOffset * randFloat(-1, 1);

   return new Point(x, y);
}

const generateDistortionTriangleTeleportPosition = (): Point => {
   let x = Camera.position.x;
   let y = Camera.position.y;

   const spawnOffset = Vars.DISTORTION_TRIANGLE_VISIBLE_AREA * Vars.DISTORTION_TRIANGLE_SPAWN_DIST;

   if (Math.random() < 0.5) {
      // Left and right sides
      x += spawnOffset * randSign();
      y += spawnOffset * randFloat(-1, 1);
   } else {
      // Top and bottom sides
      x += spawnOffset * randFloat(-1, 1);
      y += spawnOffset * randSign();
   }

   return new Point(x, y);
}

const getDistortionTriangleXDistFactor = (x: number): number => {
   return Math.abs((x - Camera.position.x) / Vars.DISTORTION_TRIANGLE_VISIBLE_AREA);
}

const getDistortionTriangleYDistFactor = (y: number): number => {
   return Math.abs((y - Camera.position.y) / Vars.DISTORTION_TRIANGLE_VISIBLE_AREA);
}

const distortionTriangleIsInTeleportRange = (distortionTriangle: DistortionTriangle): boolean => {
   const boundsMinX = Math.min(distortionTriangle.x1, distortionTriangle.x2, distortionTriangle.x3);
   const boundsMaxX = Math.max(distortionTriangle.x1, distortionTriangle.x2, distortionTriangle.x3);
   const boundsMinY = Math.min(distortionTriangle.y1, distortionTriangle.y2, distortionTriangle.y3);
   const boundsMaxY = Math.max(distortionTriangle.y1, distortionTriangle.y2, distortionTriangle.y3);

   return (getDistortionTriangleXDistFactor(boundsMinX) >= Vars.DISTORTION_TRIANGLE_TELEPORT_DIST && getDistortionTriangleXDistFactor(boundsMaxX) >= Vars.DISTORTION_TRIANGLE_TELEPORT_DIST) ||
          (getDistortionTriangleYDistFactor(boundsMinY) >= Vars.DISTORTION_TRIANGLE_TELEPORT_DIST && getDistortionTriangleYDistFactor(boundsMaxY) >= Vars.DISTORTION_TRIANGLE_TELEPORT_DIST);
}

const generateDistortionTriangleVelocity = (): Point => {
   let vx = randFloat(0.15, 1) * randSign();
   let vy = randFloat(0.15, 1) * randSign();

   vx *= 100;
   vy *= 100;

   return new Point(vx, vy);
}

export function createNightShaders(): void {
   const darknessVertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   
   out vec2 v_position;
   
   void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
   
      // Calculate and pass on game position
      vec2 screenPos = (a_position + 1.0) * u_halfWindowSize;
      v_position = (screenPos - u_halfWindowSize) / u_zoom + u_playerPos;
   }
   `;
   const darknessFragmentShaderText = `#version 300 es
   precision mediump float;
   
   #define MAX_LIGHTS ${Vars.MAX_LIGHTS}
   #define TILE_SIZE ${Settings.TILE_SIZE.toFixed(1)}

   struct RectLight {
      vec2 position;
      vec2 size;
   };
   
   // @Cleanup: UBO
   
   uniform int u_numLights;
   uniform mat3 u_lightPositionMatrices[MAX_LIGHTS];
   uniform float u_lightIntensities[MAX_LIGHTS];
   uniform float u_lightStrengths[MAX_LIGHTS];
   uniform float u_lightRadii[MAX_LIGHTS];

   uniform int u_numRectLights;
   uniform RectLight u_rectLights[MAX_LIGHTS];
   
   uniform float u_darkenFactor;
   
   in vec2 v_position;
   
   out vec4 outputColour;

   float getDistFromRectLight(vec2 position, RectLight rectLight) {
      float width = rectLight.size.x;
      float height = rectLight.size.y;
   
      // Inside the rect
      if (abs(position.x - rectLight.position.x) <= width * 0.5 && abs(position.y - rectLight.position.y) <= height * 0.5) {
         return 0.0;
      // Matching vertically
      } else if (abs(position.y - rectLight.position.y) <= height * 0.5) {
         return abs(position.x - rectLight.position.x) - width * 0.5;
      // Matching horizontally
      } else if (abs(position.x - rectLight.position.x) <= width * 0.5) {
         return abs(position.y - rectLight.position.y) - height * 0.5;
      // Anywhere else
      } else {
         float closestCornerXOffset;
         if (position.x < rectLight.position.x) {
            closestCornerXOffset = -width * 0.5;
         } else {
            closestCornerXOffset = width * 0.5;
         }
         float closestCornerYOffset;
         if (position.y < rectLight.position.y) {
            closestCornerYOffset = -height * 0.5;
         } else {
            closestCornerYOffset = height * 0.5;
         }
       
         vec2 closestCorner = rectLight.position + vec2(closestCornerXOffset, closestCornerYOffset);
         return distance(position, closestCorner);
      }
   }
    
   void main() {
      float totalLightIntensity = 0.0;

      // Point lights
      for (int i = 0; i < u_numLights; i++) {
         mat3 positionMatrix = u_lightPositionMatrices[i];
         vec2 lightPos = (positionMatrix * vec3(1.0, 1.0, 1.0)).xy;

         float lightIntensity = u_lightIntensities[i];
         float strength = u_lightStrengths[i];
         float radius = u_lightRadii[i];

         float dist = distance(v_position, lightPos);
         dist -= radius;
         if (dist < 0.0) {
            dist = 0.0;
         }

         float intensity = exp(-dist / 64.0 / strength) * lightIntensity;
         if (intensity > 0.0) {
            totalLightIntensity += intensity;
         }
      }

      // Rect lights
      float minDistFromRectLight = 999999.9;
      for (int i = 0; i < u_numRectLights; i++) {
         RectLight rectLight = u_rectLights[i];
         
         float dist = getDistFromRectLight(v_position, rectLight);
         if (dist < minDistFromRectLight) {
            minDistFromRectLight = dist;
         }
      }

      if (minDistFromRectLight < 999999.9) {
         float lightIntensity = 1.0;
         float strength = ${Vars.DROPDOWN_LIGHT_STRENGTH.toFixed(1)};

         float intensity = exp(-minDistFromRectLight / 64.0 / strength) * lightIntensity;
         if (intensity > 0.0) {
            totalLightIntensity += intensity;
         }
      }

      float opacity = mix(1.0 - u_darkenFactor, 0.0, totalLightIntensity);
      outputColour = vec4(0.0, 0.0, 0.0, opacity);
   }
   `;

   const colourVertexShaderText = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };
   
   layout(location = 0) in vec2 a_position;
   
   out vec2 v_position;
   
   void main() {
      gl_Position = vec4(a_position, 0.0, 1.0);
   
      // Calculate and pass on game position
      vec2 screenPos1 = (a_position + 1.0) * u_halfWindowSize;
      v_position = (screenPos1 - u_halfWindowSize) / u_zoom + u_playerPos;
   }
   `;
   const colourFragmentShaderText = `#version 300 es
   precision mediump float;
   
   #define MAX_LIGHTS ${Vars.MAX_LIGHTS}
   #define TILE_SIZE ${Settings.TILE_SIZE.toFixed(1)}
   
   // @Cleanup: Use a struct
   // @Cleanup: UBO
   
   uniform int u_numLights;
   uniform mat3 u_lightPositionMatrices[MAX_LIGHTS];
   uniform float u_lightIntensities[MAX_LIGHTS];
   uniform float u_lightStrengths[MAX_LIGHTS];
   uniform float u_lightRadii[MAX_LIGHTS];
   uniform vec3 u_lightColours[MAX_LIGHTS];
   
   in vec2 v_position;
   
   out vec4 outputColour;
    
   void main() {
      float r = 0.0;
      float g = 0.0;
      float b = 0.0;
      for (int i = 0; i < u_numLights; i++) {
         mat3 positionMatrix = u_lightPositionMatrices[i];
         vec2 lightPos = (positionMatrix * vec3(1.0, 1.0, 1.0)).xy;

         float lightIntensity = u_lightIntensities[i];
         float strength = u_lightStrengths[i];
         float radius = u_lightRadii[i];
         vec3 colour = u_lightColours[i];

         float dist = distance(v_position, lightPos);
         dist -= radius;
         if (dist < 0.0) {
            dist = 0.0;
         }

         float intensity = exp(-dist / 64.0 / strength) * lightIntensity;
         if (intensity > 0.0) {
            r += colour.r * intensity;
            g += colour.g * intensity;
            b += colour.b * intensity;
         }
      }

      outputColour = vec4(r, g, b, 1.0);
   }
   `;

   const darknessFramebufferVertexShader = `#version 300 es
   precision mediump float;

   layout(location = 0) in vec2 a_texCoord;

   out vec2 v_texCoord;

   void main() {
      vec2 vertPosition = (a_texCoord - 0.5) * 2.0;

      gl_Position = vec4(vertPosition, 0.0, 1.0);
      v_texCoord = a_texCoord;
   }
   `;

   const darknessFramebufferFragmentShader = `#version 300 es
   precision mediump float;
   
   uniform sampler2D u_framebufferTexure;

   in vec2 v_texCoord;

   out vec4 outputColour;

   void main() {
      vec4 framebufferColour = texture(u_framebufferTexure, v_texCoord);
      outputColour = framebufferColour;
   }
   `;

   // 
   // DISTORTION SHADERS
   // 

   const distortionVertexShader = `#version 300 es
   precision mediump float;
   
   layout(std140) uniform Camera {
      uniform vec2 u_playerPos;
      uniform vec2 u_halfWindowSize;
      uniform float u_zoom;
   };

   layout(location = 0) in vec2 a_position;
   layout(location = 1) in vec4 a_colour;

   out vec2 v_texCoord;
   out vec4 v_colour;

   void main() {
      vec2 screenPos = (a_position - u_playerPos) * u_zoom;
      vec2 clipSpacePos = screenPos / u_halfWindowSize;
      gl_Position = vec4(clipSpacePos, 0.0, 1.0);

      v_texCoord = (clipSpacePos + 1.0) * 0.5;
      v_colour = a_colour;
   }
   `;

   const distortionFragmentShader = `#version 300 es
   precision mediump float;
   
   uniform sampler2D u_darknessFramebufferTexure;

   #define DARKNESS_THRESHOLD 0.75
   
   in vec2 v_texCoord;
   in vec4 v_colour;

   out vec4 outputColour;

   void main() {
      vec4 darknessColour = texture(u_darknessFramebufferTexure, v_texCoord);
      
      if (darknessColour.a >= DARKNESS_THRESHOLD) {
         outputColour = v_colour;
         outputColour.a *= 1.0 - ((1.0 - darknessColour.a) / (1.0 - DARKNESS_THRESHOLD));
      } else {
         outputColour = vec4(0.0);
      }
   }
   `;

   darknessProgram = createWebGLProgram(gl, darknessVertexShaderText, darknessFragmentShaderText);
   bindUBOToProgram(gl, darknessProgram, UBOBindingIndex.CAMERA);
   
   // Darkness Framebuffer

   darknessFramebufferProgram = createWebGLProgram(gl, darknessFramebufferVertexShader, darknessFramebufferFragmentShader);

   const darknessFramebufferTextureUniformLocation = gl.getUniformLocation(darknessFramebufferProgram, "u_framebufferTexture")!;

   gl.useProgram(darknessFramebufferProgram);
   gl.uniform1i(darknessFramebufferTextureUniformLocation, 0);

   darknessFramebuffer = gl.createFramebuffer()!;

   darknessFramebufferVertexData = new Float32Array(12);
   darknessFramebufferVertexData[2] = 1;
   darknessFramebufferVertexData[5] = 1;
   darknessFramebufferVertexData[7] = 1;
   darknessFramebufferVertexData[8] = 1;
   darknessFramebufferVertexData[10] = 1;
   darknessFramebufferVertexData[11] = 1;

   colourProgram = createWebGLProgram(gl, colourVertexShaderText, colourFragmentShaderText);
   bindUBOToProgram(gl, colourProgram, UBOBindingIndex.CAMERA);

   darkenFactorUniformLocation = gl.getUniformLocation(darknessProgram, "u_darkenFactor")!;

   darknessVAO = gl.createVertexArray()!;
   gl.bindVertexArray(darknessVAO);

   // @Speed: Garbage collection
   const vertices = [
      -1, -1,
      1, 1,
      -1, 1,
      -1, -1,
      1, -1,
      1, 1
   ];
   
   const buffer = gl.createBuffer()!;
   gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
   gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

   gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);
   gl.enableVertexAttribArray(0);

   gl.bindVertexArray(null);

   distortionProgram = createWebGLProgram(gl, distortionVertexShader, distortionFragmentShader);
   bindUBOToProgram(gl, distortionProgram, UBOBindingIndex.CAMERA);
   
   const distortionProgramDarknessTextureUniformLocation = gl.getUniformLocation(darknessFramebufferProgram, "u_darknessFramebufferTexure")!;

   gl.useProgram(distortionProgram);
   gl.uniform1i(distortionProgramDarknessTextureUniformLocation, 0);
   
   // Create initial distortion triangles
   for (let i = 0; i < 5000; i++) {
      const spawnPos = generateDistortionTriangleSpawnPosition();
      
      const x1 = spawnPos.x;
      const y1 = spawnPos.y;
      const x2 = x1 + randFloat(-Vars.DISTORTION_TRIANGLE_MAX_SIZE, Vars.DISTORTION_TRIANGLE_MAX_SIZE);
      const y2 = y1 + randFloat(-Vars.DISTORTION_TRIANGLE_MAX_SIZE, Vars.DISTORTION_TRIANGLE_MAX_SIZE);
      const x3 = x1 + randFloat(-Vars.DISTORTION_TRIANGLE_MAX_SIZE, Vars.DISTORTION_TRIANGLE_MAX_SIZE);
      const y3 = y1 + randFloat(-Vars.DISTORTION_TRIANGLE_MAX_SIZE, Vars.DISTORTION_TRIANGLE_MAX_SIZE);
      
      const velocity = generateDistortionTriangleVelocity();
      
      const distortionTriangle: DistortionTriangle = {
         x1: x1,
         y1: y1,
         x2: x2,
         y2: y2,
         x3: x3,
         y3: y3,
         vx: velocity.x,
         vy: velocity.y,
         r: randFloat(0.1, 0.15),
         g: randFloat(0.1, 0.15),
         b: randFloat(0.1, 0.15),
         a: randFloat(0.005, 0.02)
      };
      distortionTriangles.push(distortionTriangle);
   }
}

/** Returns the minimum light level for the layer */
const getAmbientLightLevel = (layer: Layer): number => {
   if (layer === surfaceLayer) {
      if (Board.time >= 6 && Board.time < 18) {
         return  1;
      } else if (Board.time >= 18 && Board.time < 20) {
         return  lerp(1, NIGHT_LIGHT, (Board.time - 18) / 2);
      } else if (Board.time >= 4 && Board.time < 6) {
         return lerp(1, NIGHT_LIGHT, (6 - Board.time) / 2);
      } else {
         return NIGHT_LIGHT;
      }
   } else {
      return 0;
   }
}

const getVisibleRectLights = (layer: Layer): ReadonlyArray<RectLight> => {
   // Surface has no visible rect lights
   if (layer === surfaceLayer) {
      return [];
   }
   
   const dropdownLightSpreadRange = Math.pow(Vars.DROPDOWN_LIGHT_STRENGTH, 2);
   const minTileX = Math.floor((Camera.minVisibleX - dropdownLightSpreadRange * Settings.TILE_SIZE) / Settings.TILE_SIZE);
   const maxTileX = Math.floor((Camera.maxVisibleX + dropdownLightSpreadRange * Settings.TILE_SIZE) / Settings.TILE_SIZE);
   const minTileY = Math.floor((Camera.minVisibleY - dropdownLightSpreadRange * Settings.TILE_SIZE) / Settings.TILE_SIZE);
   const maxTileY = Math.floor((Camera.maxVisibleY + dropdownLightSpreadRange * Settings.TILE_SIZE) / Settings.TILE_SIZE);

   // Check the surface layer for dropdown tiles
   const rectLights = new Array<RectLight>();
   for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
         const tileIndex = getTileIndexIncludingEdges(tileX, tileY);
         const tile = surfaceLayer.getTile(tileIndex);

         if (tile.type === TileType.dropdown) {
            rectLights.push({
               x: (tileX + 0.5) * Settings.TILE_SIZE,
               y: (tileY + 0.5) * Settings.TILE_SIZE,
               width: Settings.TILE_SIZE,
               height: Settings.TILE_SIZE
            });
         }
      }
   }

   return rectLights;
}

export function updateDarknessDistortions(): void {
   // Update existing distortion triangles
   for (let i = 0; i < distortionTriangles.length; i++) {
      const distortionTriangle = distortionTriangles[i];

      const posAddX = distortionTriangle.vx * Settings.I_TPS;
      const posAddY = distortionTriangle.vy * Settings.I_TPS;
      
      distortionTriangle.x1 += posAddX;
      distortionTriangle.y1 += posAddY;
      distortionTriangle.x2 += posAddX;
      distortionTriangle.y2 += posAddY;
      distortionTriangle.x3 += posAddX;
      distortionTriangle.y3 += posAddY;

      if (distortionTriangleIsInTeleportRange(distortionTriangle)) {
         const newPos = generateDistortionTriangleTeleportPosition();

         distortionTriangle.x1 = newPos.x;
         distortionTriangle.y1 = newPos.y;
         distortionTriangle.x2 = distortionTriangle.x1 + randFloat(-Vars.DISTORTION_TRIANGLE_MAX_SIZE, Vars.DISTORTION_TRIANGLE_MAX_SIZE);
         distortionTriangle.y2 = distortionTriangle.y1 + randFloat(-Vars.DISTORTION_TRIANGLE_MAX_SIZE, Vars.DISTORTION_TRIANGLE_MAX_SIZE);
         distortionTriangle.x3 = distortionTriangle.x1 + randFloat(-Vars.DISTORTION_TRIANGLE_MAX_SIZE, Vars.DISTORTION_TRIANGLE_MAX_SIZE);
         distortionTriangle.y3 = distortionTriangle.y1 + randFloat(-Vars.DISTORTION_TRIANGLE_MAX_SIZE, Vars.DISTORTION_TRIANGLE_MAX_SIZE);

         const newVelocity = generateDistortionTriangleVelocity();
         distortionTriangle.vx = newVelocity.x;
         distortionTriangle.vy = newVelocity.y;
      }
   }
}

export function renderLighting(layer: Layer): void {
   const ambientLightLevel = getAmbientLightLevel(layer);

   const pointLights = layer.lights;
   const rectLights = getVisibleRectLights(layer);

   // @Speed
   const lightPositionMatrices = new Array<number>();
   const lightIntensities = new Array<number>();
   const lightStrengths = new Array<number>();
   const lightRadii = new Array<number>();
   const lightColours = new Array<number>();
   for (let i = 0; i < pointLights.length; i++) {
      const light = pointLights[i];
      const positionMatrix = getLightPositionMatrix(light);
      
      lightPositionMatrices.push(positionMatrix[0]);
      lightPositionMatrices.push(positionMatrix[1]);
      lightPositionMatrices.push(positionMatrix[2]);
      lightPositionMatrices.push(positionMatrix[3]);
      lightPositionMatrices.push(positionMatrix[4]);
      lightPositionMatrices.push(positionMatrix[5]);
      lightPositionMatrices.push(positionMatrix[6]);
      lightPositionMatrices.push(positionMatrix[7]);
      lightPositionMatrices.push(positionMatrix[8]);

      lightIntensities.push(light.intensity);
      lightStrengths.push(light.strength);
      lightRadii.push(light.radius);
      lightColours.push(light.r);
      lightColours.push(light.g);
      lightColours.push(light.b);
   }

   gl.enable(gl.BLEND);

   if (!OPTIONS.nightVisionIsEnabled) {
      gl.bindVertexArray(darknessVAO);
      gl.bindFramebuffer(gl.FRAMEBUFFER, darknessFramebuffer);
   
      if (lastTextureWidth !== windowWidth || lastTextureHeight !== windowHeight) {
         darknessFramebufferTexture = createTexture(windowWidth, windowHeight);
   
         lastTextureWidth = windowWidth;
         lastTextureHeight = windowHeight;
      }
   
      // Attach the texture as the first color attachment
      const attachmentPoint = gl.COLOR_ATTACHMENT0;
      gl.framebufferTexture2D(gl.FRAMEBUFFER, attachmentPoint, gl.TEXTURE_2D, darknessFramebufferTexture, 0);

      // Reset the previous texture
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(darknessProgram);
   
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
   
      gl.uniform1f(darkenFactorUniformLocation, ambientLightLevel);

      const darknessNumLightsLocation = gl.getUniformLocation(darknessProgram, "u_numLights")!;
      gl.uniform1i(darknessNumLightsLocation, pointLights.length);
      if (pointLights.length > 0) {
         const lightPosLocation = gl.getUniformLocation(darknessProgram, "u_lightPositionMatrices")!;
         gl.uniformMatrix3fv(lightPosLocation, false, new Float32Array(lightPositionMatrices));
         const lightIntensityLocation = gl.getUniformLocation(darknessProgram, "u_lightIntensities")!;
         gl.uniform1fv(lightIntensityLocation, new Float32Array(lightIntensities));
         const lightStrengthLocation = gl.getUniformLocation(darknessProgram, "u_lightStrengths")!;
         gl.uniform1fv(lightStrengthLocation, new Float32Array(lightStrengths));
         const lightRadiiLocation = gl.getUniformLocation(darknessProgram, "u_lightRadii")!;
         gl.uniform1fv(lightRadiiLocation, new Float32Array(lightRadii));
      }

      const numRectLightsLocation = gl.getUniformLocation(darknessProgram, "u_numRectLights")!;
      gl.uniform1i(numRectLightsLocation, rectLights.length);
      for (let i = 0; i < rectLights.length; i++) {
         const rectLight = rectLights[i];
         
         const positionLocation = gl.getUniformLocation(darknessProgram, "u_rectLights[" + i + "].position");
         const sizeLocation = gl.getUniformLocation(darknessProgram, "u_rectLights[" + i + "].size");

         gl.uniform2f(positionLocation, rectLight.x, rectLight.y);
         gl.uniform2f(sizeLocation, rectLight.width, rectLight.height);
      }
   
      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Draw darkness

      gl.bindVertexArray(null);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      gl.useProgram(darknessFramebufferProgram);

      // @Speed
      const buffer2 = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer2);
      gl.bufferData(gl.ARRAY_BUFFER, darknessFramebufferVertexData, gl.STATIC_DRAW);

      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 2 * Float32Array.BYTES_PER_ELEMENT, 0);

      gl.enableVertexAttribArray(0);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, darknessFramebufferTexture);

      gl.drawArrays(gl.TRIANGLES, 0, 6);

      // Render darkness distortions

      gl.useProgram(distortionProgram);

      const vertices = new Array<number>();
      for (const distortionTriangle of distortionTriangles) {
         vertices.push(
            distortionTriangle.x1, distortionTriangle.y1, distortionTriangle.r, distortionTriangle.g, distortionTriangle.b, distortionTriangle.a,
            distortionTriangle.x2, distortionTriangle.y2, distortionTriangle.r, distortionTriangle.g, distortionTriangle.b, distortionTriangle.a,
            distortionTriangle.x3, distortionTriangle.y3, distortionTriangle.r, distortionTriangle.g, distortionTriangle.b, distortionTriangle.a
         );
      }

      // @Speed
      const buffer = gl.createBuffer()!;
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 0);
      gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 6 * Float32Array.BYTES_PER_ELEMENT, 2 * Float32Array.BYTES_PER_ELEMENT);

      gl.enableVertexAttribArray(0);
      gl.enableVertexAttribArray(1);
      
      gl.drawArrays(gl.TRIANGLES, 0, distortionTriangles.length * 3);
   }

   gl.bindVertexArray(darknessVAO);
   gl.useProgram(colourProgram);

   gl.blendFunc(gl.ONE, gl.ONE);

   // @Speed: pre-calculate uniform locations
   const colourNumLightsLocation = gl.getUniformLocation(colourProgram, "u_numLights")!;
   gl.uniform1i(colourNumLightsLocation, pointLights.length);
   if (pointLights.length > 0) {
      const lightPosLocation = gl.getUniformLocation(colourProgram, "u_lightPositionMatrices")!;
      gl.uniformMatrix3fv(lightPosLocation, false, new Float32Array(lightPositionMatrices));
      const lightIntensityLocation = gl.getUniformLocation(colourProgram, "u_lightIntensities")!;
      gl.uniform1fv(lightIntensityLocation, new Float32Array(lightIntensities));
      const lightStrengthLocation = gl.getUniformLocation(colourProgram, "u_lightStrengths")!;
      gl.uniform1fv(lightStrengthLocation, new Float32Array(lightStrengths));
      const lightRadiiLocation = gl.getUniformLocation(colourProgram, "u_lightRadii")!;
      gl.uniform1fv(lightRadiiLocation, new Float32Array(lightRadii));
      const lightColourLocation = gl.getUniformLocation(colourProgram, "u_lightColours")!;
      gl.uniform3fv(lightColourLocation, new Float32Array(lightColours));
   }

   gl.drawArrays(gl.TRIANGLES, 0, 6);

   gl.bindVertexArray(null);

   gl.disable(gl.BLEND);
   gl.blendFunc(gl.ONE, gl.ZERO);
}