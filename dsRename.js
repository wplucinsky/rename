const fs = require('fs');

const minimist = require('minimist');
const csv = require('csv-parser');

/*
  Running directions
    - copy all the images that should be renamed into /images
    - update the `mapping.csv` file to go from a ##-DS-#### id to the new id pattern
    - open Git Bash
      - change directory (cd) to root folder
        - likely `cd Documents/code`
      - run `node dsRename.js --mapping=mapping.csv` 
*/


// TODO: this really should be a command line option....
const matchRegex = new RegExp(/\d*[- ]DS[- ]\d*/g);

// file type match, ie. ".png", ".jpg", etc...
const typeMatch = new RegExp(/[.]\w+/g);

// sanitize the new id
const idSanitize = (id) => {
  const sanitized = id.replace(/(\r\n|\n|\r)/gm, '');

  return sanitized;
}

const readMapping = (path) => {
  const mapping = {};

  return new Promise((resolve) => {
    fs.createReadStream(path)
      .pipe(csv())
      .on('data', (data) => {
        const currentId = data[Object.keys(data)[0]];

        // make sure we have a valid id match in the initial column
        const currentMatches = currentId.match(matchRegex);
        if (!currentMatches || currentMatches.length === 0) {
          console.log(`Unknown mapping ${currentId}`);
          return;
        }

        // TODO: could do some sanitization here
        const currentMatch = currentMatches[0];

        // remove new lines
        const idSanitized = idSanitize(data.id);

        // map the current id to the new id
        mapping[currentMatch] = {
          id: idSanitized,
        }
      })
      .on('end', () => resolve(mapping));
  })
}

const rename = (path, mapping) => {
  return new Promise((resolve) => {
    fs.readdir(path, (err, filenames) => {
      if (err) {
        console.error(err);
        return;
      }
      for (let filename of filenames) {
        // get the file type extension so it can be added later
        const typeMatches = filename.match(typeMatch);

        // is the file one we're looking for
        const currentMatches = filename.match(matchRegex);
        if (!currentMatches || currentMatches.length === 0) {
          console.log(`SKIPPING: ${filename} does not match the Regex: ${matchRegex}`);
          continue;
        }

        const currentMatch = currentMatches[0];
        const fileType = typeMatches && typeMatches.length !== 0 ? typeMatches[0] : '.jpg';

        // get the new filename from the map
        const map = mapping[currentMatch];
        if (!map || !map.id) {
          console.log(`SKIPPING: Missing mapping for name ${currentMatch}, filename ${filename}.`);
          continue;
        }
        let newname = map.id;

        /** 
         * Perform the following transform. Ensuring the original number maps to the new number.
         * 
         * 09-DS-84535      –> 250647
         * 09-DS-84535_ALT  –> 250647_1
         * 09-DS-84535_ALT1 –> 250647_2
         * 09-DS-84535_ALT2 –> 250647_3
         * 09-DS-84535_ALT3 –> 250647_4
         * 09-DS-84535_ALT4 –> 250647_5
         * 09-DS-84535_ALT5 –> 250647_6
         */

        const altOrEmpty = filename.toLowerCase().replace(currentMatch.toLowerCase(), '').replace(fileType.toLowerCase(), '');
        if (altOrEmpty !== '') {
          const numberAfterAltOrEmpty = altOrEmpty.replace('_alt', '');
          if (numberAfterAltOrEmpty === '') {
            newname += '_1';
          } else {
            let num = Number(numberAfterAltOrEmpty);
            if (isNaN(num) || num === 0) {
              console.log(`SKIPPING: Unknown value ${numberAfterAltOrEmpty} after _alt, ${filename}, ${altOrEmpty}`);
              newname = undefined;
            }
            newname += `_${num + 1}`;
          }
        } // else do nothing     
        
        if (newname !== undefined) {
          newname += fileType;
          // console.log(`mv ${filename} ${newname}`);
          fs.rename(`${path}/${filename}`, `${path}/rename/${newname}`, (err) => {
            if ( err ) {
              console.error(err);
            }
          });
        }
      }
      resolve();
    });
  });
}


const main = async () => {
  const args = minimist(process.argv.slice(2));
  const mappingPath = args.mapping;

  if (!mappingPath) {
    console.error('Missing `node rename.js --mapping=/path/to/file`. Exiting');
    return;
  }

  // read the mappings file first to create a mapping from initial id -> new id
  const mapping = await readMapping(`${__dirname}/${mappingPath}`);

  // rename the files using the mapping
  await rename(`${__dirname}/images`, mapping);
}


main();
