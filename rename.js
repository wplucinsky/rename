const fs = require('fs');

const minimist = require('minimist');
const csv = require('csv-parser');

/*
  Running directions
    - copy all the images that should be renamed into /images
    - update the `mapping.csv` file to go from NV id to the new id pattern
    - open Git Bash
      - change directory (cd) to root folder
        - likely `cd Documents/code`
      - run `node rename.jd --mapping=mapping.csv` 
*/


const nvMatch = new RegExp(/(NV|PZ|HV)[- ]\d*[- ]\d*/g);

// sanitize the New View id
const nvSanitize = (nvid) => {
  const sanitized = nvid.toUpperCase()
    .replace('NV ', 'NV-')
    .replace('PZ ', 'PZ-')
    .replace('HV ', 'HV-')
    .replace(/(\r\n|\n|\r)/gm, '');

  return sanitized;
}

// sanitize the new id
const idSanitize = (id) => {
  const sanitized = id.replace(/(\r\n|\n|\r)/gm, '');

  return sanitized;
}

// sanitize the multi column, ie ABC
const multiSanitize = (id) => {
  const sanitized = id.replace(/(\r\n|\n|\r)/gm, '');

  return sanitized;
}

const readMapping = (path) => {
  const mapping = {};

  return new Promise((resolve) => {
    fs.createReadStream(path)
      .pipe(csv())
      .on('data', (data) => {
        // the nvid column has a weird character that doesn't allow me to do `data.nvid`
        const nvid = data[Object.keys(data)[0]];

        // make sure we have a valid New View id in the NVID column
        const nvidMatches = nvid.match(nvMatch);
        if (!nvidMatches || nvidMatches.length === 0) {
          console.log(`Unknown mapping ${nvid}`);
          return;
        }

        // sanitize the id
        const nvidSanitized = nvSanitize(nvidMatches[0]);

        // remove new lines
        const idSanitized = idSanitize(data.id);
        const multiSanitized = multiSanitize(data.mutli || '');

        // map the nvid to the new id
        mapping[nvidSanitized] = {
          id: idSanitized,
          mutli: multiSanitized,
          altNum: 1,
        }
      })
      .on('end', () => resolve(mapping));
  })
}

const rename = (path, mapping) => {
  // file type match, ie. ".png", ".jpg", etc...
  const typeMatch = new RegExp(/[.]\w+/g);

  return new Promise((resolve) => {
    fs.readdir(path, (err, filenames) => {
      if (err) {
        console.error(err);
        return;
      }
      for (let filename of filenames) {
        const nvidMatches = filename.match(nvMatch);
        const typeMatches = filename.match(typeMatch);

        // make sure we have an New View id filename
        if (!nvidMatches || nvidMatches.length === 0) {
          console.log(`${filename} is missing the (NV|PZ|HV) id, Skipping.`);
          continue;
        }

        const nvid = nvSanitize(nvidMatches[0]);
        const fileType = typeMatches && typeMatches.length !== 0 ? typeMatches[0] : '.jpg';

        const map = mapping[nvid];
        if (!map || !map.id) {
          console.log(`Missing mapping for name ${nvid}, filename ${filename}. Skipping.`);
          continue;
        }

        let newname = map.id;

        const onlyModifier = nvSanitize(filename.replace(nvidMatches[0], '').replace(fileType, '')).toLowerCase();

        map.mutli = 'ABC';
        if (map.mutli) {
          if (onlyModifier.indexOf('_front') !== -1 || onlyModifier === map.mutli.toLowerCase()) { // or nothing
            // do nothing
          }
          else if (onlyModifier.indexOf('_moodshot') !== -1 || onlyModifier.indexOf('_mood') !== -1) {
            newname += `_alt`;
          }
          else if (onlyModifier.indexOf('_back') !== -1 && onlyModifier.indexOf(`${map.mutli.split('')[0].toLowerCase()}_`) !== -1) {
            newname += `_alt${map.altNum}`;
            map.altNum = map.altNum + 1;
          }
          else if (onlyModifier.indexOf('_back') !== -1) {
            newname = undefined;
          }
          else {
            newname += `_alt${map.altNum}`;
            map.altNum = map.altNum + 1;
          }
        }
        else {
          const lower = filename.toLowerCase();
          if (lower.indexOf('_front') !== -1) {
            // main image
          }
          if (lower.indexOf('_moodshot') !== -1 || lower.indexOf('_mood') !== -1) {
            newname += '_alt';
          }
          if (lower.indexOf('_back') !== -1) {
            newname += '_alt1';
          }
        }
        
        
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

  const mapping = await readMapping(`${__dirname}/${mappingPath}`);
  await rename(`${__dirname}/images`, mapping);
}


main();
