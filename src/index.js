import * as BABYLON from '@babylonjs/core';
import testVert from './shaders/test.vert?raw';
import testFrag from './shaders/test.frag?raw';
import * as poly2tri from 'poly2tri';

const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas);
const scene = new BABYLON.Scene(engine);
const camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 5, -10), scene);
camera.setTarget(BABYLON.Vector3.Zero());
let ctx;

setTimeout(() => {
  ctx = canvas.getContext('webgl2');
  console.log(ctx);
}, 1000);

// camera.attachControl(canvas, true);

const light = new BABYLON.HemisphericLight('light1', new BABYLON.Vector3(0, 1, 0), scene);
light.intensity = 0.7;

const material = new BABYLON.StandardMaterial('test', scene);
const shaderMaterial = new BABYLON.ShaderMaterial(
  'shaderMaterial',
  scene,
  {
    vertexSource: testVert,
    fragmentSource: testFrag,
  },
  {
    attributes: ['position'],
    uniforms: ['worldViewProjection'],
  }
);

//--------------------------------------------------------------------------------------
//triangleのテスト
//--------------------------------------------------------------------------------------
const createMesh = (contour) => {
  const myPoints = [];
  var swctx = new poly2tri.SweepContext(contour);
  swctx.triangulate();
  var triangles = swctx.getTriangles();
  console.log(triangles);

  for (let i = 0; i < triangles.length; i++) {
    //color情報を付与
    const c = { r: Math.random(), g: Math.random(), b: Math.random() };
    for (let j = 0; j < 3; j++) {
      const x = triangles[i].getPoint(j).x;
      const y = triangles[i].getPoint(j).y;
      const z = 1;

      const data = {
        point: new BABYLON.Vector3(x, y, z),
        color: c,
      };

      myPoints.push(data);
    }
  }

  const vertexData = new BABYLON.VertexData();
  vertexData.positions = myPoints.map((d) => [d.point.x, d.point.y, d.point.z]).flat();
  vertexData.indices = myPoints.map((_, index) => index);
  vertexData.colors = myPoints.map((d) => [d.color.r, d.color.g, d.color.b, 1]).flat();
  vertexData.applyToMesh(new BABYLON.Mesh('mesh', scene), true);
};

//--------------------------------------------------------------------------------------
//マウスでの描画
//--------------------------------------------------------------------------------------
let points = [];
let arr = [];
let lineMesh = null;
let isDrawing = false;
const distanceThreshold = 0.1; // ワールド座標での保存間隔

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
  isDrawing = true;
  points = []; // 新しいラインを描画するためにポイントをリセット
  const worldPos = screenToWorld(scene.pointerX, scene.pointerY);
  points.push(worldPos);
  arr = [];
});

// Pointermoveイベントでラインを描画
canvas.addEventListener('pointermove', function (e) {
  if (isDrawing) {
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
  }
});

// Pointerupイベントで描画を終了
canvas.addEventListener('pointerup', function (e) {
  isDrawing = false;
  if (points.length > 1) {
    createMesh(arr);
  }
});

// Render every frame
engine.runRenderLoop(() => {
  scene.render();
});
