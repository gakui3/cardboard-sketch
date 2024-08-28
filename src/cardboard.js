import * as BABYLON from '@babylonjs/core';
import testVert from './shaders/test.vert?raw';
import testFrag from './shaders/test.frag?raw';
import paintVert from './shaders/paint.vert?raw';
import paintFrag from './shaders/paint.frag?raw';
import * as poly2tri from 'poly2tri';
import debug from './shaders/debug.glsl?raw';
import blit from './shaders/blit.glsl?raw';
import copy from './shaders/copy.glsl?raw';
import composite from './shaders/composite.glsl?raw';
import quadVert from './shaders/quad.vert?raw';

const thickness = 0.35;

export class Cardboard {
  triangles = [];
  indices = [];
  vertices = [];
  centroids = [];

  paintSrcRT = new BABYLON.RenderTargetTexture('paintSrcRT', 1024, window.scene);
  paintDestRT = new BABYLON.RenderTargetTexture('paintResultRT', 1024, window.scene);
  tempRT = new BABYLON.RenderTargetTexture('tempRT', 1024, window.scene);
  resultRT = new BABYLON.RenderTargetTexture('compositeRT', 1024, window.scene);

  paintMaterial;

  constructor(arr) {
    this.createDelaunayTriangles(arr);

    this.paintSrcRT.clearColor = new BABYLON.Color4(0.0, 0.0, 0.0, 0.0);
    window.scene.customRenderTargets.push(this.paintSrcRT);

    // ---------- graphics blitの設定 ----------
    // this.paintDestRT = new BABYLON.RenderTargetTexture('paintResultRT', 1024, window.scene);
    this.paintDestRT.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    // this.tempRT = new BABYLON.RenderTargetTexture('tempRT', 1024, window.scene);
    this.tempRT.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    // this.resultRT = new BABYLON.RenderTargetTexture('compositeRT', 1024, window.scene);
    this.resultRT.clearColor = new BABYLON.Color4(0, 0, 0, 0);

    // 加算用
    new BABYLON.FreeCamera('blitCamera', new BABYLON.Vector3(0, 0, -1), window.paintScene);

    const blitMesh = BABYLON.MeshBuilder.CreatePlane('quad', { size: 2 }, window.paintScene);
    const blitMaterial = new BABYLON.ShaderMaterial(
      'blitMaterial',
      window.paintScene,
      {
        vertexSource: quadVert,
        fragmentSource: blit,
      },
      {
        attributes: ['position', 'uv'],
        uniforms: ['paintSrcTexture', 'tempTexture'],
      }
    );
    blitMaterial.setTexture('paintSrcTexture', this.paintSrcRT);
    blitMaterial.setTexture('tempTexture', this.tempRT);
    blitMesh.material = blitMaterial;

    this.paintDestRT.renderList.push(blitMesh);
    window.paintScene.customRenderTargets.push(this.paintDestRT);

    //copy用
    const copyMesh = BABYLON.MeshBuilder.CreatePlane('quad', { size: 2 }, window.paintScene);
    const copyMaterial = new BABYLON.ShaderMaterial(
      'copyMaterial',
      window.paintScene,
      {
        vertexSource: quadVert,
        fragmentSource: copy,
      },
      {
        attributes: ['position', 'uv'],
        uniforms: ['paintDestTexture'],
      }
    );
    copyMaterial.setTexture('paintDestTexture', this.paintDestRT);
    copyMesh.material = copyMaterial;

    this.tempRT.renderList.push(copyMesh);
    window.paintScene.customRenderTargets.push(this.tempRT);

    //textureコンポジット用
    const compositeMesh = BABYLON.MeshBuilder.CreatePlane('quad', { size: 2 }, window.paintScene);
    const compositeMaterial = new BABYLON.ShaderMaterial(
      'compositeMaterial',
      window.paintScene,
      {
        vertexSource: quadVert,
        fragmentSource: composite,
      },
      {
        attributes: ['position', 'uv'],
        uniforms: ['resultTexture', 'backgroundTexture'],
      }
    );

    const tex = new BABYLON.Texture('./paper/paper-diffuse.png', window.scene);
    compositeMaterial.setTexture('paintDestTexture', this.paintDestRT);
    compositeMaterial.setTexture('backgroundTexture', tex);
    compositeMesh.material = compositeMaterial;

    this.resultRT.renderList.push(compositeMesh);
    window.paintScene.customRenderTargets.push(this.resultRT);
  }

  //--------------------------------------------------------------------------------------
  //triangleの生成関数
  //--------------------------------------------------------------------------------------
  createDelaunayTriangles = (contour) => {
    this.triangles = [];
    this.indices = [];
    this.vertices = [];
    this.centroids = [];
    const swctx = new poly2tri.SweepContext(contour);
    swctx.triangulate();
    this.triangles = swctx.getTriangles();

    for (let i = 0; i < this.triangles.length; i++) {
      let c;
      const neighbors = this.triangles[i].neighbors_;
      // console.log(i, neighbors);
      // const trueCount = neighbors.filter((value) => value !== null).length;
      //計算済みかどうかのフラグ情報を持たせる
      this.triangles[i].calculated = false;
      let trueCount = 0;
      for (let j = 0; j < neighbors.length; j++) {
        if (neighbors[j] !== null) {
          if (neighbors[j].isInterior()) {
            trueCount++;
          }
        }
      }
      if (trueCount === 3) {
        c = { r: 1, g: 0, b: 0 };
        this.triangles[i].type = 'Junction';
      } else if (trueCount === 2) {
        this.triangles[i].type = 'Sleeve';
        c = { r: 1, g: 1, b: 1 };
      } else {
        this.triangles[i].type = 'Terminal';
        c = { r: 1, g: 1, b: 0 };
      }
      this.triangles[i].id = i;
      this.triangles[i].getPoint();
    }

    // debugPoints.sort((a, b) => a.id - b.id);
    contour.sort((a, b) => a.id - b.id);

    // ---------- vertices,indicesの作成 ----------
    this.vertices = [];
    this.indices = [];
    for (let i = 0; i < contour.length; i++) {
      this.vertices.push(contour[i].x, contour[i].y, contour[i].z);
    }
    for (let i = 0; i < this.triangles.length; i++) {
      this.indices.push(this.triangles[i].getPoint(0).id);
      this.indices.push(this.triangles[i].getPoint(1).id);
      this.indices.push(this.triangles[i].getPoint(2).id);
    }

    // ---------- meshの作成 ----------
    // createMesh(vertices, indices);

    // ---------- 頂点間にlineを描画 ----------
    // createLine(indices);

    // ---------- 頂点の位置にidを描画 ----------
    // drawVertexIds(vertices);

    // ---------- 重心の計算と描画 ----------
    // this.calculateCentroid(this.vertices, this.indices);
    // drawCentroidIds();

    // clipCentroidLine(contour);

    this.createBaseMesh(this.vertices, this.indices);
    this.createThicknessMesh(this.vertices);
    // createLine(vertices, indices);
  };

  isPointInsideCircle = (A, B, P) => {
    // AとBを直径とする円の中心を求める
    const centerX = (A.x + B.x) / 2;
    const centerY = (A.y + B.y) / 2;

    // AとBの距離の半分を円の半径とする
    const radius = Math.sqrt((B.x - A.x) ** 2 + (B.y - A.y) ** 2) / 2;

    // Pと円の中心の距離を求める
    const distanceToCenter = Math.sqrt((P.x - centerX) ** 2 + (P.y - centerY) ** 2);

    // Pが円の内側にあるかを判定する
    return distanceToCenter <= radius;
  };

  createBaseMesh = (vertices, indices) => {
    const margedVertices = [];
    const margedIndices = [...indices];
    const verticesLength = vertices.length / 3;

    for (let i = 0; i < 2; i++) {
      for (let k = 0; k < vertices.length; k++) {
        const p = (k + 1) % 3 == 0 ? vertices[k] + thickness * i : vertices[k];
        // const p = vertices[k];
        margedVertices.push(p);
      }
    }

    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i] + verticesLength;
      margedIndices.push(idx);
    }
    // console.log('margedIndices', margedIndices);

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    // console.log('min', minX, minY);
    // console.log('max', maxX, maxY);

    // const uvs = [];
    // for (let i = 0; i < 2; i++) {
    //   for (let k = 0; k < vertices.length; k += 3) {
    //     const x = vertices[k];
    //     const y = vertices[k + 1];
    //     const u = (x - minX) / (maxX - minX);
    //     const v = (y - minY) / (maxY - minY);
    //     // console.log('uv', u, v);
    //     uvs.push(u, v);
    //   }
    // }

    const angle = Math.random() * Math.PI * 2; // ランダムな角度 (0〜360度)
    const cosAngle = Math.cos(angle);
    const sinAngle = Math.sin(angle);

    // UV座標を計算
    const uvs = [];
    for (let i = 0; i < 2; i++) {
      for (let k = 0; k < vertices.length; k += 3) {
        const x = vertices[k];
        const y = vertices[k + 1];

        // UV座標の計算（正規化）
        let u = (x - minX) / (maxX - minX);
        let v = (y - minY) / (maxY - minY);

        // 回転行列を適用
        // const rotatedU = u * cosAngle - v * sinAngle;
        // const rotatedV = u * sinAngle + v * cosAngle;

        // 回転後のUV座標を追加
        // uvs.push(rotatedU, rotatedV);

        uvs.push(u, v);
      }
    }

    //normalの計算
    const normals = [];
    BABYLON.VertexData.ComputeNormals(margedVertices, margedIndices, normals);
    this.faceNormal = new BABYLON.Vector3(normals[0], normals[1], normals[2]);

    const vertexData = new BABYLON.VertexData();
    vertexData.positions = margedVertices;
    vertexData.indices = margedIndices;
    vertexData.uvs = uvs;
    vertexData.normals = normals;

    const mesh = new BABYLON.Mesh('mesh', window.scene);
    vertexData.applyToMesh(mesh, true);

    const material = new BABYLON.PBRMaterial('cardboardMaterial', window.scene);
    material.albedoTexture = this.resultRT; //new BABYLON.Texture('./paper/paper-diffuse.png', window.scene); // アルベドテクスチャ（ディフューズマップ）
    material.bumpTexture = new BABYLON.Texture('./paper/paper-normal.jpg', window.scene); // ノーマルマップ（バンプテクスチャ）
    material.parallaxTexture = new BABYLON.Texture('./paper/paper-bump.jpg', window.scene); // 高さマップ（パララックスマッピング）
    material.parallaxScaleBias = 0.05; // パララックス効果のスケールを設定
    material.roughness = 1.0; // 粗さを高く設定（光沢を抑える）
    material.metallic = 0.0; // 金属度はゼロ（段ボールは非金属）
    material.useAmbientOcclusionFromMetallicTextureRed = true; // 環境遮蔽
    material.backFaceCulling = false;

    // const material = new BABYLON.ShaderMaterial(
    //   'shaderMaterial',
    //   window.scene,
    //   {
    //     vertexSource: testVert,
    //     fragmentSource: testFrag,
    //   },
    //   {
    //     attributes: ['position', 'normal', 'uv'],
    //     uniforms: ['worldViewProjection'],
    //   }
    // );
    // material.backFaceCulling = false;

    mesh.material = material;

    // ---------- ペイント用のrtの用意 ----------
    // const rt = new BABYLON.RenderTargetTexture('rt', 1024, window.scene);
    const cloneMesh = mesh.clone('cloneMesh');
    cloneMesh.layerMask = 0x10000000;
    this.paintMaterial = new BABYLON.ShaderMaterial(
      'shaderMaterial',
      window.scene,
      {
        vertexSource: paintVert,
        fragmentSource: paintFrag,
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: [
          'worldViewProjection',
          'world',
          'normalMatrix',
          'brushSize',
          'lightColor',
          'lightPosition',
          'lightDirection',
        ],
      }
    );
    cloneMesh.material = this.paintMaterial;
    this.paintMaterial.setFloat('brushSize', 0.5);

    this.paintSrcRT.renderList.push(cloneMesh);
    this.paintSrcRT.activeCamera = window.depthCamera;
  };

  createSurfaceMesh = (vertices, indices) => {};

  createLine = (vertices, indices) => {
    for (let i = 0; i < indices.length; i += 3) {
      points = [];
      points.push(
        new BABYLON.Vector3(
          vertices[indices[i] * 3],
          vertices[indices[i] * 3 + 1],
          vertices[indices[i] * 3 + 2]
        )
      );
      points.push(
        new BABYLON.Vector3(
          vertices[indices[i + 1] * 3],
          vertices[indices[i + 1] * 3 + 1],
          vertices[indices[i + 1] * 3 + 2]
        )
      );
      points.push(
        new BABYLON.Vector3(
          vertices[indices[i + 2] * 3],
          vertices[indices[i + 2] * 3 + 1],
          vertices[indices[i + 2] * 3 + 2]
        )
      );
      points.push(
        new BABYLON.Vector3(
          vertices[indices[i] * 3],
          vertices[indices[i] * 3 + 1],
          vertices[indices[i] * 3 + 2]
        )
      );

      const line = BABYLON.MeshBuilder.CreateLines(
        'line',
        {
          points: points,
        },
        window.scene
      );
      line.color = new BABYLON.Color3(0, 0, 0);
    }
  };

  drawVertexIds = (vertice) => {
    for (let i = 0; i < vertice.length; i += 3) {
      const text = document.createElement('div');
      text.textContent = i / 3;
      text.style.position = 'absolute';
      const screen = BABYLON.Vector3.Project(
        new BABYLON.Vector3(vertice[i], vertice[i + 1] + 0.25, vertice[i + 2]),
        BABYLON.Matrix.Identity(),
        window.scene.getTransformMatrix(),
        camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
      );
      text.style.left = `${screen.x}px`;
      text.style.top = `${screen.y}px`;
      text.style.color = 'red';
      document.body.appendChild(text);
    }
  };

  calculateCentroid = (vertice, indices) => {
    for (let i = 0; i < indices.length; i += 3) {
      const x =
        (vertice[indices[i] * 3] + vertice[indices[i + 1] * 3] + vertice[indices[i + 2] * 3]) / 3;
      const y =
        (vertice[indices[i] * 3 + 1] +
          vertice[indices[i + 1] * 3 + 1] +
          vertice[indices[i + 2] * 3 + 1]) /
        3;
      const z = 1;
      const c = new BABYLON.Vector3(x, y, z);
      this.centroids.push(c);
    }
  };

  drawCentroidIds = () => {
    for (let i = 0; i < centroids.length; i++) {
      const centerScreen = BABYLON.Vector3.Project(
        centroids[i],
        BABYLON.Matrix.Identity(),
        window.scene.getTransformMatrix(),
        camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
      );
      const text = document.createElement('div');
      text.textContent = i;
      text.style.position = 'absolute';
      text.style.left = `${centerScreen.x}px`;
      text.style.top = `${centerScreen.y}px`;
      document.body.appendChild(text);
    }
  };

  createThicknessMesh = (vertices) => {
    const mergedVertices = [];
    const indices = [];

    //頂点をpush
    for (let i = 0; i < 2; i++) {
      for (let k = 0; k < vertices.length; k++) {
        if ((k + 1) % 3 === 0) {
          mergedVertices.push(vertices[k] + thickness * i);
        } else {
          mergedVertices.push(vertices[k]);
        }
        if (k === vertices.length - 1) {
          mergedVertices.push(vertices[0]);
          mergedVertices.push(vertices[1]);
          mergedVertices.push(vertices[2] + thickness * i);
          break;
        }
      }
    }

    const verticesLength = mergedVertices.length / 2 / 3;

    for (let i = 0; i < verticesLength - 1; i++) {
      const idx0 = i;
      const idx1 =
        i + verticesLength + 1 >= verticesLength * 2 ? verticesLength : i + verticesLength + 1;
      const idx2 = i + verticesLength;

      // console.log('idx', i, ':', idx0, idx1, idx2);
      indices.push(idx0, idx1, idx2);
    }

    for (let i = 0; i < verticesLength - 1; i++) {
      const idx0 = i;
      const idx1 = i + 1 >= verticesLength ? 0 : i + 1;
      const idx2 =
        i + verticesLength + 1 >= verticesLength * 2 ? verticesLength : i + verticesLength + 1;

      // console.log('idx', i, ':', idx0, idx1, idx2);
      indices.push(idx0, idx1, idx2);
    }

    //uvの設定
    const uvs = [];
    for (let i = 0; i < mergedVertices.length; i += 3) {
      const idx = i / 3 < 0 ? 0 : i / 3;
      const idxLength = mergedVertices.length / 3;

      const u =
        idx < idxLength / 2
          ? this.remap(idx, 0, idxLength / 2, 0, 1)
          : this.remap(idx, idxLength / 2, idxLength, 0, 1);
      const v = idx < idxLength / 2 ? 0 : 1;
      // console.log('uv', u, ',', v);
      uvs.push(u);
      uvs.push(v);
    }

    var normals = [];
    BABYLON.VertexData.ComputeNormals(mergedVertices, indices, normals);

    const vertexData = new BABYLON.VertexData();
    vertexData.positions = mergedVertices;
    vertexData.indices = indices;
    vertexData.normals = normals;
    vertexData.uvs = uvs;

    const mesh = new BABYLON.Mesh('mesh', window.scene);
    vertexData.applyToMesh(mesh, true);

    // const material = new BABYLON.StandardMaterial('testMat', window.scene);
    // material.emissiveTexture = new BABYLON.Texture('./test.png', window.scene);
    // material.disableLighting = true;
    // material.diffuseColor = new BABYLON.Color3(1, 1, 1);

    const wrapMode = BABYLON.Texture.WRAP_ADDRESSMODE;
    const samplingMode = BABYLON.Texture.BILINEAR_SAMPLINGMODE;
    const texture = new BABYLON.Texture('./paper/paper-side.jpg', window.scene);
    texture.wrapU = wrapMode;
    texture.wrapV = wrapMode;
    texture.updateSamplingMode(samplingMode);

    const material = new BABYLON.ShaderMaterial(
      'shaderMaterial',
      window.scene,
      {
        vertexSource: testVert,
        fragmentSource: testFrag,
      },
      {
        attributes: ['position', 'normal', 'uv'],
        uniforms: ['worldViewProjection', 'textureSampler'],
      }
    );
    material.setTexture('textureSampler', texture);
    material.backFaceCulling = false;
    mesh.material = material;
  };

  remap = (value, inMin, inMax, outMin, outMax) => {
    // 入力値が入力範囲のどの位置にあるかを計算し、出力範囲にマッピングする
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  };
}
