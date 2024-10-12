import fs from 'fs';
import archiver from 'archiver';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a file to stream archive data to.
const output = fs.createWriteStream(path.join(__dirname, 'quranic-verse-quiz.zip'));
const archive = archiver('zip', {
  zlib: { level: 9 } // Sets the compression level.
});

// Listen for all archive data to be written
output.on('close', function() {
  console.log(archive.pointer() + ' total bytes');
  console.log('archiver has been finalized and the output file descriptor has closed.');
});

// This event is fired when the data source is drained no matter what was the data source.
output.on('end', function() {
  console.log('Data has been drained');
});

// Good practice to catch warnings (ie stat failures and other non-blocking errors)
archive.on('warning', function(err) {
  if (err.code === 'ENOENT') {
    // log warning
    console.warn('Warning:', err);
  } else {
    // throw error
    throw err;
  }
});

// Good practice to catch this error explicitly
archive.on('error', function(err) {
  throw err;
});

// Pipe archive data to the file
archive.pipe(output);

// Append files
archive.file('package.json', { name: 'package.json' });
archive.file('index.html', { name: 'index.html' });
archive.file('vite.config.ts', { name: 'vite.config.ts' });
archive.file('tsconfig.json', { name: 'tsconfig.json' });
archive.file('tsconfig.node.json', { name: 'tsconfig.node.json' });
archive.file('.gitignore', { name: '.gitignore' });

// Append directories
archive.directory('src/', 'src');
archive.directory('public/', 'public');

// Finalize the archive (ie we are done appending files but streams have to finish yet)
archive.finalize();