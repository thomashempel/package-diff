# packagelock-diff

Prints a list of changed packages extracted from package-lock.json

## Installing

Install from npm:

    # npm install -g packagelock-diff

## Usage

Autofill the commit message:

    $ packagelock-diff | git commit -F-

or as a commit template:

    $ git commit -t- <(packagelock-diff)
