const app = require('../api/index');
const { spawn } = require('child_process');

const server = app.listen(3000, () => {
  console.log('Test server listening on port 3000 for test_requirements.js...');
  const child = spawn('node', ['scratch/test_requirements.js'], { stdio: 'inherit' });
  child.on('close', (code) => {
    server.close();
    process.exit(code);
  });
});
