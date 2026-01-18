import * as esbuild from 'esbuild';
import * as fs from 'fs';

const isWatch = process.argv.includes('--watch');

async function build() {
  const codeCtx = await esbuild.context({
    entryPoints: ['code.ts'],
    bundle: true,
    outfile: 'dist/code.js',
    target: 'es2020',
    format: 'iife',
    minify: !isWatch,
  });

  fs.mkdirSync('dist', { recursive: true });

  const uiHtml = fs.readFileSync('ui.html', 'utf8');
  const uiTs = fs.readFileSync('ui.ts', 'utf8');
  
  const uiResult = await esbuild.transform(uiTs, {
    loader: 'ts',
    target: 'es2020',
    minify: !isWatch,
  });

  const finalHtml = uiHtml.replace(
    '</body>',
    `<script>${uiResult.code}</script></body>`
  );
  fs.writeFileSync('dist/ui.html', finalHtml);

  if (isWatch) {
    await codeCtx.watch();
    console.log('Watching for changes...');
  } else {
    await codeCtx.rebuild();
    await codeCtx.dispose();
    console.log('Build complete');
  }
}

build().catch((e) => {
  console.error(e);
  process.exit(1);
});
