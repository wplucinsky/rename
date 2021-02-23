Running directions

- copy all the images that should be renamed into `/images`
- update the `mapping.csv` file to go from a `##-DS-####` id to the new id pattern
- open Git Bash
    - change directory (cd) to root folder
    - likely `cd Documents/code`
    - run `node dsRename.js --mapping=mapping.csv` 