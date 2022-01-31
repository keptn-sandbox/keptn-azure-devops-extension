import parse from 'json-templates'
import glob from 'glob'
import extensionConfig from '../config.json'
import { readFileSync } from 'fs';



let globalConfig = extensionConfig.main

console.log(globalConfig);

const devTemplate = parse(extensionConfig.dev);
console.log(devTemplate);
console.log(devTemplate(globalConfig));


const publicTemplate = parse(extensionConfig.public);
console.log(publicTemplate);
console.log(publicTemplate(globalConfig));

glob("../**/*.template.json", function (er, files){
    // TODO: handle errors
    files.forEach(templateFile => {
        console.log(`Found file ${templateFile}`);

        const template = parse(readFileSync(templateFile, 'utf-8'));
        console.log(template)
        console.log(template(parse(devTemplate(globalConfig))));
    });
})