import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const downloadFiles = await readdir(path.join(homedir(), "/Downloads"));

const glove80Files = await Promise.all(
  downloadFiles
    .filter(
      (file) =>
        file.toLocaleLowerCase().startsWith("glove80") && file.endsWith(".uf2")
    )
    .map(async (filePath) => {
      const fullPath = path.join(homedir(), "/Downloads", filePath);
      return {
        fileName: filePath,
        fullPath,
        info: await stat(fullPath),
      };
    })
);

glove80Files.sort((a, b) => b.info.ctimeMs - a.info.ctimeMs);

for await (const file of glove80Files) {
  console.log(`${file.fileName} - ${file.info.ctime}`);
}

const mostRecentFile = glove80Files[0];

console.log(`Most recent file: ${mostRecentFile.fileName}`);

const LEFT_PATH = "/Volumes/GLV80LHBOOT";
const RIGHT_PATH = "/Volumes/GLV80RHBOOT";

const layoutFile = Bun.file(mostRecentFile.fullPath);
await Bun.write(path.join(LEFT_PATH, mostRecentFile.fileName), layoutFile);
await Bun.write(path.join(RIGHT_PATH, mostRecentFile.fileName), layoutFile);
