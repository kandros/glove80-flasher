import { existsSync, copyFileSync, readFileSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

const args = process.argv.slice(2);

const downloadPath = path.join(homedir(), "/Downloads");
const downloadFiles = await readdir(downloadPath);

const glove80Files = await Promise.all(
  downloadFiles
    .filter((file) => file.endsWith(".uf2"))
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

if (args.includes("-v")) {
  console.log("\nFiles found:");
  for await (const file of glove80Files) {
    console.log(`${file.fileName} - ${file.info.ctime}`);
  }
  console.log("\n");
}

if (glove80Files.length === 0) {
  console.error("No Glove80 files found");
  process.exit(1);
}
const mostRecentFile = glove80Files[0];

console.log(`\nMost recent file: ${mostRecentFile.fileName}\n`);

const fileContent = readFileSync(mostRecentFile.fullPath).toString();

if (!fileContent.includes("Glove80")) {
  console.error("File is not a Glove80 firmware");
  process.exit(1);
} else {
  console.log("File is a Glove80 firmware\n");
}

const LEFT_PATH = "/Volumes/GLV80LHBOOT";
const RIGHT_PATH = "/Volumes/GLV80RHBOOT";

let leftConnected = false;
let rightConnected = false;
const maxRetries = 30;

let count = 0;
while (!leftConnected || !rightConnected) {
  count++;
  if (count > 1) {
    console.log(`\n\n[${count}/10] Waiting for Glove80 to connect`);
  }

  leftConnected = existsSync(LEFT_PATH);
  rightConnected = existsSync(RIGHT_PATH);

  if (!leftConnected) {
    console.error("← Left not connected");
  } else {
    console.log("← Left connected");
  }

  if (!rightConnected) {
    console.error("→ Right not connected");
  } else {
    console.log("→ Right connected");
  }

  if (!leftConnected || !rightConnected) {
    if (count === maxRetries) {
      process.exit(1);
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

try {
  copyFileSync(mostRecentFile.fullPath, path.join(LEFT_PATH, mostRecentFile.fileName));
  console.log("✅ Flashed firmware to left");
} catch (error) {
  console.error("Error copying file to left");
  console.error(error);
  process.exit(1);
}

try {
  copyFileSync(mostRecentFile.fullPath, path.join(RIGHT_PATH, mostRecentFile.fileName));
  console.log("✅ Flashed firmware to right");
} catch (error) {
  console.error("Error copying file to right");
  console.error(error);
  process.exit(1);
}
