import * as BABYLON from '@babylonjs/core';
import testVert from './shaders/test.vert?raw';
import testFrag from './shaders/test.frag?raw';
import * as poly2tri from 'poly2tri';

const canvas = document.getElementById('renderCanvas');
const engine = new BABYLON.Engine(canvas);
const scene = new BABYLON.Scene(engine);
const camera = new BABYLON.FreeCamera('camera1', new BABYLON.Vector3(0, 5, -10), scene);
camera.setTarget(BABYLON.Vector3.Zero());
let triangles = [];
let indices = [];
let vertices = [];
let centroids = [];

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
// utils
//--------------------------------------------------------------------------------------
const isPointInsideCircle = (A, B, P) => {
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

const createMesh = (vertices, indices) => {
  const vertexData = new BABYLON.VertexData();

  vertexData.positions = vertices;
  vertexData.indices = indices;

  vertexData.applyToMesh(new BABYLON.Mesh('mesh', scene), true);
};

const createLine = (vertices, indices) => {
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
      scene
    );
    line.color = new BABYLON.Color3(0, 0, 0);
  }
};

const drawVertexIds = (vertice) => {
  for (let i = 0; i < vertice.length; i += 3) {
    const text = document.createElement('div');
    text.textContent = i / 3;
    text.style.position = 'absolute';
    const screen = BABYLON.Vector3.Project(
      new BABYLON.Vector3(vertice[i], vertice[i + 1] + 0.25, vertice[i + 2]),
      BABYLON.Matrix.Identity(),
      scene.getTransformMatrix(),
      camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight())
    );
    text.style.left = `${screen.x}px`;
    text.style.top = `${screen.y}px`;
    text.style.color = 'red';
    document.body.appendChild(text);
  }
};

const calculateCentroid = (vertice, indices) => {
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
    centroids.push(c);
  }
};

const drawCentroidIds = () => {
  for (let i = 0; i < centroids.length; i++) {
    const centerScreen = BABYLON.Vector3.Project(
      centroids[i],
      BABYLON.Matrix.Identity(),
      scene.getTransformMatrix(),
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

//--------------------------------------------------------------------------------------
//triangleの生成関数
//--------------------------------------------------------------------------------------
const createDelaunayTriangles = (contour) => {
  triangles = [];
  indices = [];
  vertices = [];
  centroids = [];
  var swctx = new poly2tri.SweepContext(contour);
  swctx.triangulate();
  triangles = swctx.getTriangles();

  for (let i = 0; i < triangles.length; i++) {
    let c;
    const neighbors = triangles[i].neighbors_;
    // console.log(i, neighbors);
    // const trueCount = neighbors.filter((value) => value !== null).length;
    //計算済みかどうかのフラグ情報を持たせる
    triangles[i].calculated = false;
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
      triangles[i].type = 'Junction';
    } else if (trueCount === 2) {
      triangles[i].type = 'Sleeve';
      c = { r: 1, g: 1, b: 1 };
    } else {
      triangles[i].type = 'Terminal';
      c = { r: 1, g: 1, b: 0 };
    }
    triangles[i].id = i;
    triangles[i].getPoint();
  }

  // debugPoints.sort((a, b) => a.id - b.id);
  contour.sort((a, b) => a.id - b.id);

  // ---------- vertices,indicesの作成 ----------
  vertices = [];
  indices = [];
  for (let i = 0; i < contour.length; i++) {
    vertices.push(contour[i].x, contour[i].y, 1);
  }
  for (let i = 0; i < triangles.length; i++) {
    indices.push(triangles[i].getPoint(0).id);
    indices.push(triangles[i].getPoint(1).id);
    indices.push(triangles[i].getPoint(2).id);
  }

  // ---------- meshの作成 ----------
  // createMesh(vertices, indices);

  // ---------- 頂点間にlineを描画 ----------
  // createLine(indices);

  // ---------- 頂点の位置にidを描画 ----------
  drawVertexIds(vertices);

  // ---------- 重心の計算と描画 ----------
  calculateCentroid(vertices, indices);
  drawCentroidIds();

  clipCentroidLine(contour);
};

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

  createMesh(vertices, indices);
  createLine(vertices, indices);
};

//--------------------------------------------------------------------------------------
//マウスでの描画
//--------------------------------------------------------------------------------------
let points = [];
let arr = [];
let lineMesh = null;
let isDrawing = false;
const distanceThreshold = 0.5; // ワールド座標での保存間隔

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
    createDelaunayTriangles(arr);
  }
});

//--------------------------------------------------------------------------------------
// デバッグ
//--------------------------------------------------------------------------------------
// setTimeout(() => {
//   createDelaunayTriangles(debugPoints);
// }, 100);

//--------------------------------------------------------------------------------------
// レンダリングループ
//--------------------------------------------------------------------------------------
// Render every frame
engine.runRenderLoop(() => {
  scene.render();
});
