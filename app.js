const fs = require("fs");
const { program, Argument} = require('commander');
const parser = require("@babel/parser");
const generate = require("@babel/generator").default;
const traverse = require("@babel/traverse").default;
const beautify = require("js-beautify");

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

    let deobfCode = generate(ast, { comments: false }).code;
    deobfCode = beautify(deobfCode, {
        indent_size: 2,
        space_in_empty_paren: true,
    });

    return deobfCode;
}

program
    .version('1.0.0', '-v, --version')
    .usage('[OPTIONS]...')
    .option('-f, --file <file>', 'Specify file to deobfuscate.')
    .parse(process.argv)
    .action((method, options) => {
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

