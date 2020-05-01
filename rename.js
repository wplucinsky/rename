const fs = require('fs');

const minimist = require('minimist');
const csv = require('csv-parser');

const nvMatch = new RegExp(/(NV|PZ|HV)[- ]\d*[- ]\d*/g);

const readMapping = (path) => {
  const mapping = {};

  return new Promise((resolve) => {
    fs.createReadStream(path)
      .pipe(csv())
      .on('data', (data) => {
        const nvidMatches = data.nvid.match(nvMatch);
        if (!nvidMatches || nvidMatches.length === 0) {
          console.log(`Unknown mapping ${data.nvid}`);
          return;
        }

        mapping[nvidMatches[0]] = data.id
      })
      .on('end', () => resolve(mapping));
  })
}

const rename = (path, mapping) => {
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

        if (!nvidMatches || nvidMatches.length === 0) {
          console.log(`${filename} is missing the (NV|PZ|HV) id, Skipping.`);
          continue;
        }
        const nvid = nvidMatches[0]
          .replace('NV ', 'NV-')
          .replace('PZ ', 'PZ-')
          .replace('HV ', 'HV-');
          
        const type = typeMatches && typeMatches.length !== 0 ? typeMatches[0] : '.jpg';

        let newname = mapping[nvid];
        if (newname === undefined) {
          console.log(`Missing mapping for name ${nvid}, filename ${filename}. Skipping.`);
          continue;
        }

        if (filename.indexOf('_moodshot') !== -1) {
          newname += '_alt';
        }
        if (filename.indexOf('_front') !== -1) {
          // main image
        }
        if (filename.indexOf('_back') !== -1) {
          newname += '_alt2';
        }


        newname += type;

        // console.log(`${filename} => ${newname}`);
        fs.rename(`${path}/${filename}`, `${path}/rename/${newname}`, (err) => {
          if ( err ) {
            console.error(err);
          }
        });
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