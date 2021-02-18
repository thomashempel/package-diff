#! /usr/bin/env node
const fs = require("fs");
const path = require("path");
const process = require("process");
const child_process = require("child_process");
const program = require("commander");

program
  .version("1.0.0")
  .option("-d, --dir <path>", "Path to npm project")
  .parse(process.argv);

const dir = program.dir || process.cwd();
const packageLockPath = path.join(dir, "package-lock.json");

const origLock = getHeadPackageLock();
const newLock = getPackageLock();

Promise.all([origLock, newLock]).then(
  function (values) {
    var orig = values[0];
    var new_ = values[1];
    var diffs = packageDiff(orig, new_);
    writeCommitMessage(diffs);
  },
  function (err) {
    console.log("Err: " + err);
  }
);

function writeCommitMessage(diffs) {
  console.log("\nchore: Update packages\n");

  diffs.forEach(function (diff) {
    var str = "* " + diff.pkg;
    if (diff.new) {
      str += " was added";
      console.log(str);
    } else if (diff.deleted) {
      str += " was removed";
      console.log(str);
    } else if (diff.version || diff.ref) {
      if (diff.version) {
        str += ": " + diff.version.old + " => " + diff.version.new;
      } else if (diff.ref) {
        str += ": " + diff.ref.old + " => " + diff.ref.new;
      }
      console.log(str);
    }
  });
}

function extractName(key) {
  let parts = key.split('/')
  parts.shift()
  return parts.join('/')
}

function comparePackages(key, pkg1, pkg2) {
  var diff = {
    pkg: extractName(key),
  };

  if (pkg1.version !== pkg2.version) {
    diff.version = {
      old: pkg1.version,
      new: pkg2.version,
    };
  }

  if (diff.version) {
    return diff;
  }

  return false
}

function packageDiff(lock1, lock2) {
  var diffs = [];
  var pkgs1 = lock1.packages;
  var pkgs2 = lock2.packages;

  let packageKeys1 = Object.keys(pkgs1)
  let packageKeys2 = Object.keys(pkgs2)

  packageKeys1.forEach(function(pkgKey) {
    if (packageKeys2.includes(pkgKey)) {
      let diff = comparePackages(
        pkgKey,
        lock1.packages[pkgKey],
        lock2.packages[pkgKey]
      )
      if (diff !== false) {
        diffs.push(diff)
      }
    } else {
      // package was deleted
      diffs.push({
        pkg: pkg.name,
        deleted: true,
      });
    }
  });

  // Check for new packages
  packageKeys2.forEach(function (packageKey) {
    if (!packageKeys1.includes(packageKey)) {
      diffs.push({
        pkg: extractName(packageKey),
        new: true,
      });
    }
  });

  return diffs;
}

function getPackageLock() {
  return new Promise(function (resolve, reject) {
    fs.readFile(packageLockPath, "utf8", function (err, data) {
      if (err) {
        reject(err);
        return;
      }
      resolve(JSON.parse(data));
    });
  });
}

function getHeadPackageLock() {
  return new Promise(function (resolve, reject) {
    var p = child_process.spawn("git", ["show", "HEAD:./package-lock.json"], {
      cwd: dir
    });
    var data = "";

    p.stdout.on("data", function (out) {
      data += out;
    });

    p.stderr.on("data", function (err) {
      console.log(err);
    });

    p.on("error", function (err) {
      console.log(err);
      reject();
    });

    p.on("close", function () {
      resolve(JSON.parse(data));
    });
  });
}
