const traverse = require("@babel/traverse").default;
const { Data } = require("dataclass");
const generate = require("@babel/generator").default;
const ivm = require("isolated-vm");

class StringData extends Data {
    strings = [];
    offset = 0;
}


// Create a visitor that gets function b, and gets the offset value out of it
// Example function:
// function b(c, d, e) {
//         return e = a(), b = function(f, g, h) {
//             return f = f - 288, h = e[f], h
//         }, b(c, d)
//     }
// Offset value is 288

function getStringData(ast) {
    let data = StringData.create({});

    traverse(ast, {
        FunctionDeclaration(path) {
            if (path.node.id.name === "a") {
                path.traverse({
                    StringLiteral(assignmentPath) {
                        if (assignmentPath.node.value.length <= 100)
                            return;

                        data = data.copy({ strings: assignmentPath.node.value.split(',') })
                    }
                });
            }

            else if (path.node.id.name === "b") {
                path.traverse({
                    NumericLiteral(assignmentPath) {
                        data = data.copy({ offset: assignmentPath.node.value })
                    }
                });
            }

            if (data.strings.length > 0 && data.offset > 0) {
                path.stop();
            }
        },
    });

    return data;
}

function replaceBCalls(ast, data) {
    traverse(ast, {
        CallExpression(path) {
            if (path.node.callee.name === "b") {
                const result = data.strings[path.node.arguments[0].value - data.offset]

                if (result) {
                    path.replaceWith({ type: "StringLiteral", value: result })
                }
            }
        }
    });
}

function shuffleStrings(ast, data) {
    traverse(ast, {
        TryStatement(path) {
            if (generate(path.node.block).code.includes(".shift()")) {
                // get parents til CallExpression
                let parent = path.parentPath;
                while (parent.node.type !== "CallExpression") {
                    parent = parent.parentPath;
                }

                const resultInteger = parent.node.arguments[1].value;
                const f = path.scope.getBinding('f').constantViolations[0].node.right;
                const fCode = generate(f).code;

                const isolate = new ivm.Isolate();
                const context = isolate.createContextSync();

                // set strings to context
                context.evalSync(`function b(f) {
                    return strings[f - ${data.offset}];
                }`)
                context.global.setSync('global', context.global.derefInto());
                context.global.setSync('strings', new ivm.ExternalCopy(data.strings).copyInto());
                context.global.setSync('log', function(...args) {
                    console.log(...args);
                });
                context.global.setSync('setStrings', function(strings) {
                    context.global.setSync('strings', new ivm.ExternalCopy(strings).copyInto());
                });

                isolate.compileScriptSync(`
                (function() {
                    let f;
                    while (true) try {
                        if (f = ${fCode}, f === ${resultInteger}) break;
                        else strings.push(strings.shift());
                    } catch (g) {
                        strings.push(strings.shift());
                    }

                    setStrings(strings);
                })();
                `).runSync(context);

                // get the new strings
                data = data.copy({ strings: context.global.getSync('strings').copySync() });
            }
        }
    })

    return data
}


module.exports = {
    getStringData,
    replaceBCalls,
    shuffleStrings
}