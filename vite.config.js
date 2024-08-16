import basicSsl from '@vitejs/plugin-basic-ssl';

export default {
  plugins: [basicSsl()],
  server: {
    https: true,
  },
  define: {
    global: 'window',
  },
  preview: {
    https: true,
  },
  assetsInclude: [
    '**/*.glb',
    '**/*.gltf',
    '**/*.fbx',
    '**/*.mp4',
    '**/*.webp',
    '**/*.png',
    '**/*.jpg',
  ],
  build: {
    outDir: 'docs',
  },
  base: '/teddy/',
};
