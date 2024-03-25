const fs = require("fs");
const { program} = require('commander');
const parser = require("@babel/parser");
const generate = require("@babel/generator").default;
const beautify = require("js-beautify");
const { replaceStrings, } = require("./transformers/strings");

function writeCodeToFile(code) {
    let outputPath = `data/output/${Date.now().toString()}.js`;
    fs.writeFile(outputPath, code, (err) => {
        if (err) {
            console.log("Error writing file", err);
        } else {
            console.log(`Wrote deobfuscated code to ${outputPath}`);
        }
    });
}

function deobfuscate(sourceCode) {
    const ast = parser.parse(sourceCode);

    // traverse ast here
    replaceStrings(ast);

    let deobfuscatedSource = generate(ast, { comments: false }).code;
    deobfuscatedSource = beautify(deobfuscatedSource, {
        indent_size: 2,
        space_in_empty_paren: true,
    });

    return deobfuscatedSource;
}

program
    .version('1.0.0', '-v, --version')
    .usage('[OPTIONS]...')
    .option('-f, --file <file>', 'Specify file to deobfuscate.')
    .parse(process.argv)
    .action((options) => {
        if (options.file) {
            fs.readFile(options.file, "utf8", (err, data) => {
                if (err) {
                    console.log("Error reading file", err);
                } else {
                    console.log('Deobfuscating...')
                    let deobfuscatedCode = deobfuscate(data);
                    writeCodeToFile(deobfuscatedCode);
                }
            });
        } else {
            console.log('Please specify a file to deobfuscate.')
        }
    });

program.parse();

