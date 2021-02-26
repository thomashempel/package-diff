#! /usr/bin/env node
const fs = require("fs");
const process = require("process");
const child_process = require("child_process");
const program = require("commander");

if (!fs.existsSync("./package-lock.json")) {
  process.stderr.write("package-json.lock does not exist!\n");
  return -1;
}

program
  .version("1.1.1")
  .option("-e, --errors", "Output errors")
  .option("-p, --prefix <string>", "Commit message default", "chore")
  .parse(process.argv);

const options = program.opts();

const writeCommitMessage = (diffs) => {
  const prefix = options.prefix + ": ";
  process.stdout.write(prefix + "Update packages\n\n");

  diffs.forEach(function (diff) {
    var str = "* " + diff.pkg;
    if (diff.new) {
      str += " was added";
      process.stdout.write(str + "\n");
    } else if (diff.deleted) {
      str += " was removed";
      process.stdout.write(str + "\n");
    } else if (diff.version || diff.ref) {
      if (diff.version) {
        str += ": " + diff.version.old + " => " + diff.version.new;
      } else if (diff.ref) {
        str += ": " + diff.ref.old + " => " + diff.ref.new;
      }
      process.stdout.write(str + "\n");
    }
  });
};

const comparePackages = (package_key, package_old, package_new) => {
  let diff = {
    pkg: package_key,
  };

  if (package_old.version !== package_new.version) {
    diff.version = {
      old: package_old.version,
      new: package_new.version,
    };
  }

  if (diff.version) {
    return diff;
  }

  return false;
};

const packageDiff = (lock_head, lock_current) => {
  let diffs = [];

  let packages_head = lock_head.packages;
  let packages_current = lock_current.packages;

  let package_keys_head = Object.keys(packages_head);
  let package_keys_current = Object.keys(packages_current);

  package_keys_head.forEach((package_key) => {
    if (package_key === "") {
      return;
    }

    if (package_keys_current.includes(package_key)) {
      let diff = comparePackages(
        package_key,
        packages_head[package_key],
        packages_current[package_key]
      );
      if (diff !== false) {
        diffs.push(diff);
      }
    } else {
      // package was deleted
      diffs.push({
        pkg: package_key,
        deleted: true,
      });
    }
  });

  // Check for new packages
  package_keys_current.forEach((package_key) => {
    if (package_key === "") {
      return;
    }
    if (!package_keys_head.includes(package_key)) {
      diffs.push({
        pkg: package_key,
        new: true,
      });
    }
  });

  return diffs;
};

const loadCurrentPackageLock = () => {
  return new Promise(function (resolve, reject) {
    fs.readFile("./package-lock.json", "utf8", function (error, data) {
      if (error) {
        reject(error);
        return;
      }
      resolve(JSON.parse(data));
    });
  });
};

const loadHeadPackageLock = () => {
  return new Promise(function (resolve) {
    var p = child_process.spawn("git", ["show", "HEAD:./package-lock.json"]);

    var json = "";

    p.stdout.on("data", (data) => {
      json += data;
    });

    p.stderr.on("data", (data) => {
      if (options.errors) {
        process.stderr.write(`stderr: ${data}`);
      }
    });

    p.on("close", (code) => {
      if (code !== 0) {
        resolve({ packages: [] });
      } else {
        resolve(JSON.parse(json));
      }
    });
  });
};

const lock_head = loadHeadPackageLock();
const lock_updated = loadCurrentPackageLock();

Promise.all([lock_head, lock_updated]).then(
  function (values) {
    const [head, current] = values;
    const diffs = packageDiff(head, current);
    writeCommitMessage(diffs);
  },
  function (error) {
    if (options.errors) {
      process.stderr.write(`Err: ${error}\n`);
    }
  }
);
