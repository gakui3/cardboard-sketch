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
import { AdvancedDynamicTexture, Checkbox, TextBlock, Button } from '@babylonjs/gui/2D';
import { Cardboard } from './cardboard';
import GUI from 'lil-gui';

//--------------------------------------------------------------------------------------
// セットアップ
//--------------------------------------------------------------------------------------
const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas);
const scene = new BABYLON.Scene(engine);
window.scene = scene;

const camera = new BABYLON.ArcRotateCamera(
  'camera',
  -1.57,
  1.57, // 3.14,
  10,
  new BABYLON.Vector3(0, 0, -1),
  scene
);
camera.setTarget(BABYLON.Vector3.Zero());
//mainCameraにlayerMaskを設定。paint描画用のmeshをレンダリングしないようにするため
camera.layerMask = 0x0fffffff;

const carboards = [];
const paintScene = new BABYLON.Scene(engine);
window.paintScene = paintScene;
new BABYLON.FreeCamera('blitCamera', new BABYLON.Vector3(0, 0, -1), paintScene);

const mode = {
  CREATE: 0,
  PAINT: 1,
};

let currentMode = mode.CREATE;

// const depthCamera = new BABYLON.ArcRotateCamera(
//   'depthCamera',
//   Math.PI,
//   Math.PI / 4,
//   10,
//   BABYLON.Vector3.Zero(),
//   scene
// );
const depthCamera = new BABYLON.FreeCamera('depthCamera', new BABYLON.Vector3(0, 0, -1), scene);
window.depthCamera = depthCamera;

const depthRenderer = scene.enableDepthRenderer(depthCamera);
const depthTexture = depthRenderer.getDepthMap();

let isAnyKeyPressed = false;
let paintMaterial;

const debugPoints = [
  { x: -1.596416592544705, y: -2.8413638648418367, id: 0 },
  { x: -2.140466349690566, y: -2.086678610622105, id: 1 },
  { x: -2.4652451888000435, y: -1.2665913521741494, id: 2 },
  { x: -2.5383523119011304, y: -0.49554212273614784, id: 3 },
  { x: -2.4482070549013364, y: 0.3495577849858096, id: 4 },
  { x: -1.7819472326181347, y: 0.8204120201048535, id: 5 },
  { x: -0.9813723249067593, y: 0.5664489003601165, id: 6 },
  { x: -0.07681711706719108, y: 0.7487103310305203, id: 7 },
  { x: 0.5186321560927507, y: 1.2720716248739734, id: 8 },
  { x: 1.26983104777283, y: 1.614706707948994, id: 9 },
  { x: 2.0428515267918073, y: 1.4703526411589443, id: 10 },
  { x: 2.599022803454241, y: 0.6409399149551045, id: 11 },
  { x: 2.889287526867249, y: -0.1806702691676696, id: 12 },
  { x: 2.8512112707732005, y: -0.937279145313151, id: 13 },
  { x: 2.4839184070037934, y: -1.6439308747071477, id: 14 },
  { x: 1.9545292187997758, y: -2.362877858870534, id: 15 },
  { x: 1.4019368773518626, y: -2.9808155162280023, id: 16 },
  { x: 0.7647628659255457, y: -3.5728183521811756, id: 17 },
  { x: 0.11185614860680937, y: -3.9684976590805903, id: 18 },
  { x: -0.6805903541441504, y: -4.1369743239711845, id: 19 },
];

// camera.attachControl(canvas, true);

const light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0.2, 1, 0), scene);
light.intensity = 0.7;

//ambient light
const ambient = new BABYLON.HemisphericLight('ambient', new BABYLON.Vector3(0.2, 1, -0.2), scene);
ambient.intensity = 1.0;

function transformCoordinatesCustom(vector, matrix) {
  const x =
    vector.x * matrix.m[0] +
    vector.y * matrix.m[4] +
    vector.z * matrix.m[8] +
    vector.w * matrix.m[12];
  const y =
    vector.x * matrix.m[1] +
    vector.y * matrix.m[5] +
    vector.z * matrix.m[9] +
    vector.w * matrix.m[13];
  const z =
    vector.x * matrix.m[2] +
    vector.y * matrix.m[6] +
    vector.z * matrix.m[10] +
    vector.w * matrix.m[14];
  const w =
    vector.x * matrix.m[3] +
    vector.y * matrix.m[7] +
    vector.z * matrix.m[11] +
    vector.w * matrix.m[15];

  // 透視除算
  return new BABYLON.Vector4(x / w, y / w, z / w, 1.0);
}

function hexToNormalizedVector3(hex) {
  // 先頭の # を取り除く
  hex = hex.replace(/^#/, '');

  // 各色成分を抽出
  let r = parseInt(hex.substring(0, 2), 16);
  let g = parseInt(hex.substring(2, 4), 16);
  let b = parseInt(hex.substring(4, 6), 16);

  // 0〜255の値を0〜1に正規化
  let rNormalized = r / 255;
  let gNormalized = g / 255;
  let bNormalized = b / 255;

  // Vector3として返す
  return new BABYLON.Vector3(rNormalized, gNormalized, bNormalized);
}

//--------------------------------------------------------------------------------------
// 重心線の刈り取り
//--------------------------------------------------------------------------------------
const clipCentroidLine = (contour) => {
  let pointIds = [];

  const calculateIsPointInside = (A, B) => {
    for (let j = 0; j < pointIds.length; j++) {
      const P = contour[pointIds[j]];
      if (!isPointInsideCircle(A, B, P)) {
        // console.log('outside', P);
        return false;
      }
    }
    return true;
  };

  const updateIndices = (arr1, diameterIds) => {
    let result = [];
    for (let i = 0; i < indices.length; i += 3) {
      const p = { a: indices[i], b: indices[i + 1], c: indices[i + 2] };
      result.push(p);
    }

    for (let k = 0; k < arr1.length; k++) {
      result = result.filter(
        (index) => !(index.a === arr1[k].a && index.b === arr1[k].b && index.c === arr1[k].c)
      );
    }

    let newIndices = [];
    for (let l = 0; l < result.length; l++) {
      newIndices.push(result[l].a);
      newIndices.push(result[l].b);
      newIndices.push(result[l].c);
    }

    // arr1の配列[{a: 5, b: 4, c: 6},{a: 6, b: 4, c: 3},{a: 2, b: 6, c: 3}]から、
    // diameterIds[a,b]を削除して、[2, 3, 4, 5, 6]のような配列を作成する
    // 1. arr1の値をフラットな配列にまとめる
    // console.log('arr1', arr1);
    let flattened = arr1.flatMap((obj) => [obj.a, obj.b, obj.c]);
    // 2. arr2に含まれる要素を削除
    flattened = flattened.filter((value) => !diameterIds.includes(value));
    // 3. 重複を除去してソート
    const uniqueIndices = [...new Set(flattened)].sort((a, b) => a - b);

    // ---------- 直径の中点を追加 ----------
    const midPoint = {
      x: (contour[diameterIds[0]].x + contour[diameterIds[1]].x) / 2,
      y: (contour[diameterIds[0]].y + contour[diameterIds[1]].y) / 2,
    };
    vertices.push(midPoint.x, midPoint.y, 1);
    const addedIndex = vertices.length / 3 - 1;
    // console.log('midPoint', midPoint, addedIndex);
    // console.log('diameterIds', diameterIds);

    // uniqueSortedと、addedIndexを使って新しいindicesを作成
    for (let m = 0; m < uniqueIndices.length + 1; m++) {
      if (m === 0) {
        newIndices.push(addedIndex);
        newIndices.push(uniqueIndices[m]);
        newIndices.push(diameterIds[0]);
        // console.log(m, ':', addedIndex, uniqueIndices[m], diameterIds[0]);
      } else if (m === uniqueIndices.length) {
        // console.log(m, ':', addedIndex, diameterIds[1], uniqueIndices[uniqueIndices.length - 1]);
        newIndices.push(addedIndex);
        newIndices.push(diameterIds[1]);
        newIndices.push(uniqueIndices[uniqueIndices.length - 1]);
      } else {
        const first = addedIndex;
        const second = uniqueIndices[m];
        const third = uniqueIndices[m - 1];
        newIndices.push(first);
        newIndices.push(second);
        newIndices.push(third);
        // console.log(m, ':', first, second, third);
      }
    }
    indices = newIndices;
  };

  for (let i = 0; i < triangles.length; i++) {
    if (triangles[i].type === 'Terminal') {
      let triangle = triangles[i];
      let nextTriangle = null;
      let isAllPointsInside = true;
      let tempIndices = [];
      pointIds = [];
      // console.log(i, 'TerminalTri', triangle);

      const LIMITED = 20;
      let count = 0;

      while (isAllPointsInside) {
        let diameterIds = [];

        // tempIndices.push(triangle.getPoint(0).id);
        // tempIndices.push(triangle.getPoint(1).id);
        // tempIndices.push(triangle.getPoint(2).id);
        tempIndices.push({
          a: triangle.getPoint(0).id,
          b: triangle.getPoint(1).id,
          c: triangle.getPoint(2).id,
        });

        //triangleのpointをpointsにpush。被りがある場合はpushしない
        for (let j = 0; j < 3; j++) {
          if (!pointIds.includes(triangle.getPoint(j).id)) {
            pointIds.push(triangle.getPoint(j).id);
          }
        }

        let constrained_edges = triangle.constrained_edge;
        for (let j = 0; j < 3; j++) {
          //constrainedではないedgeを取得
          //またそのedgeに隣接しているtriangleが計算済みかどうかを判定
          if (!constrained_edges[j] && !triangle.neighbors_[j].calculated) {
            nextTriangle = triangle.neighbors_[j];
            // console.log('idx', j);
            //edgeのindexから頂点を取得
            if (j === 0) {
              diameterIds.push(triangle.getPoint(1).id);
              diameterIds.push(triangle.getPoint(2).id);
            }
            if (j === 1) {
              diameterIds.push(triangle.getPoint(2).id);
              diameterIds.push(triangle.getPoint(0).id);
            }
            if (j === 2) {
              diameterIds.push(triangle.getPoint(0).id);
              diameterIds.push(triangle.getPoint(1).id);
            }
          }
        }
        //求めたdiametersIdを元にisPointInsideCircleを判定
        const A = contour[diameterIds[0]];
        const B = contour[diameterIds[1]];
        if (!calculateIsPointInside(A, B) || nextTriangle.type === 'Junction') {
          // console.log('points is outside');
          // console.log(tempIndices);
          updateIndices(tempIndices, diameterIds);
          break;
        }

        //すべての頂点が円の内側にある場合、隣接しているtriangleに移る
        triangle.calculated = true;
        triangle = nextTriangle;
        // console.log('nextTri', triangle);

        count++;
        if (count > LIMITED) {
          break;
        }
      }
    }
  }

  // createBaseMesh(vertices, indices);
  // createLine(vertices, indices);
};

//--------------------------------------------------------------------------------------
//マウスでの描画
//--------------------------------------------------------------------------------------
let points = [];
let arr = [];
let lineMesh = null;
let isDrawing = false;
const distanceThreshold = 0.2; // ワールド座標での保存間隔

// 画面座標をワールド座標に変換する関数
function screenToWorld(x, y) {
  const pickRay = scene.createPickingRay(x, y, BABYLON.Matrix.Identity(), camera);

  // カメラからのレイを特定の距離スケールで拡大して使用します。
  // ここでは地面をz = 0の平面と仮定しているため、以下の計算でワールド座標を取得します。
  const distance = -camera.position.z / pickRay.direction.z;
  const worldPos = pickRay.origin.add(pickRay.direction.scale(distance));

  return worldPos;
}

// Pointerdownイベントで描画を開始
canvas.addEventListener('pointerdown', function (e) {
  if (isAnyKeyPressed) return;

  if (currentMode === mode.CREATE) {
    isDrawing = true;
    points = []; // 新しいラインを描画するためにポイントをリセット
    const worldPos = screenToWorld(scene.pointerX, scene.pointerY);
    points.push(worldPos);
    arr = [];
  } else if (currentMode === mode.PAINT) {
    isDrawing = true;
  }
});

// Pointermoveイベントでラインを描画
canvas.addEventListener('pointermove', function (e) {
  if (isAnyKeyPressed) return;

  if (isDrawing) {
    if (currentMode === mode.CREATE) {
      const worldPos = screenToWorld(scene.pointerX, scene.pointerY);

      // 一定間隔でのみポイントを追加
      if (
        points.length === 0 ||
        BABYLON.Vector3.Distance(points[points.length - 1], worldPos) > distanceThreshold
      ) {
        points.push(worldPos);
        const x = worldPos.x;
        const y = worldPos.y;
        const id = arr.length;
        const data = {
          x: x,
          y: y,
          id: id,
        };
        arr.push(data);
        // ラインを更新または作成
        if (lineMesh) {
          lineMesh.dispose(); // 既存のラインを削除
        }
        lineMesh = BABYLON.MeshBuilder.CreateLines('line', { points: points }, scene);
      }
    } else if (currentMode === mode.PAINT) {
      const ray = scene.createPickingRay(
        scene.pointerX,
        scene.pointerY,
        BABYLON.Matrix.Identity(),
        camera
      );
      const distantPoint = ray.origin.add(ray.direction.scale(1)); // レイの方向に10単位進んだポイント
      depthCamera.position = camera.position;
      // depthCamera.setTarget(distantPoint);
      depthCamera.setTarget(BABYLON.Vector3.Zero());

      // ---------- test ----------
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;

      // pointerX, pointerY をキャンバス内にクリッピング
      const clippedX = Math.min(Math.max(scene.pointerX, 0), canvasWidth);
      const clippedY = Math.min(Math.max(scene.pointerY, 0), canvasHeight);

      // 0~1の範囲に正規化
      const normalizedX = clippedX / canvasWidth;
      const normalizedY = clippedY / canvasHeight;

      // NDC (正規化されたデバイス座標) に変換 (-1から1の範囲)
      const ndcX = normalizedX * 2.0 - 1.0;
      const ndcY = 1.0 - normalizedY * 2.0; // Y座標は反転

      const invProjectionMatrix = BABYLON.Matrix.Invert(camera.getProjectionMatrix());
      const invViewMatrix = BABYLON.Matrix.Invert(camera.getViewMatrix());

      // const matrixArray = invProjectionMatrix.m;

      // for (let i = 0; i < matrixArray.length; i++) {
      //   if (Object.is(matrixArray[i], -0)) {
      //     matrixArray[i] = 0;
      //   }
      // }

      // クリップ座標を作成
      const clipSpace = new BABYLON.Vector4(ndcX, ndcY, -0.5, 1.0);
      // クリップ座標をビュー座標に変換
      const viewSpace = transformCoordinatesCustom(clipSpace, invProjectionMatrix);
      // ビュー座標系からワールド座標系へ
      const worldSpace = BABYLON.Vector3.TransformCoordinates(viewSpace.toVector3(), invViewMatrix);
      // ライトの位置
      const lightPosition = camera.position; // 例として (0, 1, 0)
      // ワールド空間の点へのベクトルを計算し、方向ベクトルを求める
      let direction = worldSpace.subtract(lightPosition);

      if (carboards.length === 0) return;

      for (let i = 0; i < carboards.length; i++) {
        carboards[i].paintMaterial.setVector3('lightPosition', camera.position);
        carboards[i].paintMaterial.setVector3('lightDirection', direction);
      }
    }
  }
});

// Pointerupイベントで描画を終了
canvas.addEventListener('pointerup', function (e) {
  if (isAnyKeyPressed) return;

  if (currentMode === mode.CREATE) {
    isDrawing = false;
    if (points.length > 1) {
      // createDelaunayTriangles(arr);
      const cardboard = new Cardboard(arr);

      carboards.push(cardboard);
    }
  } else if (currentMode === mode.PAINT) {
    isDrawing = false;
    for (let i = 0; i < carboards.length; i++) {
      carboards[i].paintMaterial.setVector3('lightPosition', camera.position);
      carboards[i].paintMaterial.setVector3(
        'lightDirection',
        new BABYLON.Vector3(-100, -100, -100)
      );
    }
  }
});

window.addEventListener('keydown', function (e) {
  if (!isAnyKeyPressed) {
    // 一度無効化したら再度無効化しないように
    camera.attachControl(canvas, true); // カメラ制御を再有効化
    isAnyKeyPressed = true;
  }
});

// キーが離されたときにカメラ制御を再有効化
window.addEventListener('keyup', function (e) {
  if (isAnyKeyPressed) {
    // 何かキーが押されている場合のみ再有効化
    camera.detachControl(canvas); // カメラ制御を無効化
    isAnyKeyPressed = false;
  }
});

//--------------------------------------------------------------------------------------
// デバッグ
//--------------------------------------------------------------------------------------
// depth bufferをデバッグ用に表示するための関数
const debugObj = () => {
  let cardboard;

  let advancedTexture = AdvancedDynamicTexture.CreateFullscreenUI('GUI', true, scene);

  //textureのラベルを描画
  const texture01 = new TextBlock();
  texture01.text = 'depthTexture';
  texture01.height = '30px';
  texture01.left = '32.5%';
  texture01.top = '-45%';
  texture01.color = 'white';
  advancedTexture.addControl(texture01);

  const texture02 = new TextBlock();
  texture02.text = 'paintSrcRT';
  texture02.height = '30px';
  texture02.left = '32.5%';
  texture02.top = '-32.5%';
  texture02.color = 'white';
  advancedTexture.addControl(texture02);

  const texture03 = new TextBlock();
  texture03.text = 'paintDestRT';
  texture03.height = '30px';
  texture03.left = '32.5%';
  texture03.top = '-20%';
  texture03.color = 'white';
  advancedTexture.addControl(texture03);

  const texture04 = new TextBlock();
  texture04.text = 'resultRT';
  texture04.height = '30px';
  texture04.left = '32.5%';
  texture04.top = '-7.5%';
  texture04.color = 'white';
  advancedTexture.addControl(texture04);

  setTimeout(() => {
    BABYLON.Effect.ShadersStore.debugFragmentShader = debug;
    const debugPP = new BABYLON.PostProcess(
      'Debug',
      'debug',
      ['depthTextureSampler', 'paintSrcSampler', 'paintDestSampler', 'resultSampler'],
      ['depthTextureSampler', 'paintSrcSampler', 'paintDestSampler', 'resultSampler'],
      1.0,
      camera
    );
    debugPP.onApply = function (effect) {
      effect.setTexture('depthTextureSampler', depthTexture);
      effect.setTexture('paintSrcSampler', cardboard.paintSrcRT);
      effect.setTexture('paintDestSampler', cardboard.paintDestRT);
      effect.setTexture('resultSampler', cardboard.resultRT);
    };
  }, 500);

  setTimeout(() => {
    // createDelaunayTriangles(debugPoints);
    cardboard = new Cardboard(debugPoints);
    carboards.push(cardboard);
  }, 100);
};

//--------------------------------------------------------------------------------------
// GUIの設定
//--------------------------------------------------------------------------------------
const gui = new GUI();
const params = {
  isCreateMode: true,
  brushSize: 0.5,
};

const colorFormats = {
  string: '#ffffff',
  int: 0xffffff,
  object: { r: 1, g: 1, b: 1 },
  array: [1, 1, 1],
};

gui.add(params, 'isCreateMode').onChange((value) => {
  if (value) {
    currentMode = mode.CREATE;
  } else {
    currentMode = mode.PAINT;
  }
});
gui.add(params, 'brushSize', 0.25, 2.0).onChange((value) => {
  carboards.forEach((obj) => {
    obj.paintMaterial.setFloat('brushSize', value);
  });
});
gui.addColor(colorFormats, 'string').onChange((value) => {
  carboards.forEach((obj) => {
    const col = hexToNormalizedVector3(value);
    obj.paintMaterial.setVector3('lightColor', col);
  });
});

//--------------------------------------------------------------------------------------
// レンダリングループ
//--------------------------------------------------------------------------------------
// Render every frame
engine.runRenderLoop(() => {
  paintScene.render();
  scene.render();
});
