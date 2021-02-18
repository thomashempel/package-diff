# package-diff

Prints a list of changed packages extracted from package-lock.json

## Installing

Install from npm:

    # npm install -g package-diff

## Usage

Autofill the commit message:

    $ package-diff | git commit -F-

or as a commit template:

    $ git commit -t- <(package-diff)
