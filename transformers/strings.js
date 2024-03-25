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
                        path.remove();
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


// Create a visitor that will remove and replace all proxy assignments
// Example:
// for (jq = b, function(c, d, jp, e, f) {
//             for (jp = b, e = c(); !![];) try {
//                 if (f = -parseInt(jp(755)) / 1 * (-parseInt(jp(897)) / 2) + parseInt(jp(705)) / 3 + -parseInt(jp(3540)) / 4 * (parseInt(jp(1810)) / 5) + -parseInt(jp(1421)) / 6 * (parseInt(jp(860)) / 7) + parseInt(jp(2745)) / 8 + parseInt(jp(2872)) / 9 + parseInt(jp(2986)) / 10 * (parseInt(jp(3551)) / 11), f === d) break;
//                 else e.push(e.shift())
//             } catch (g) {
//                 e.push(e.shift())
//             }
//         }(a, 411090), g5 = this || self, g6 = g5[jq(3086)], g7 = function(jr, d, e, f, g) {
//             return jr = jq, d = {
//                 'cOFGz': function(h, i) {
//                     return h == i
//                 },
// Result:
// for (function(c, d, jp, e, f) {
//             for (e = c(); !![];) try {
//                 if (f = -parseInt(b(755)) / 1 * (-parseInt(b(897)) / 2) + parseInt(b(705)) / 3 + -parseInt(b(3540)) / 4 * (parseInt(b(1810)) / 5) + -parseInt(b(1421)) / 6 * (parseInt(b(860)) / 7) + parseInt(b(2745)) / 8 + parseInt(b(2872)) / 9 + parseInt(b(2986)) / 10 * (parseInt(b(3551)) / 11), f === d) break;
//                 else e.push(e.shift())
//             } catch (g) {
//                 e.push(e.shift())
//             }
//         }(a, 411090), || self, g6 = this[b(3086)], g7 = function(jr, d, e, f, g) {
//             return d = {
//                 'cOFGz': function(h, i) {
//                     return h == i
//                 },


function removeProxyAssignments(ast) {
    traverse(ast, {
        AssignmentExpression(path) {
            // if right side of the variable is a function (identifier -> get the node, validate it's a function)
            if (path.node.right.type === "Identifier" && path.scope.getBinding(path.node.right.name) && path.scope.getBinding(path.node.right.name).path.node.type === "FunctionDeclaration") {
                const left = path.scope.getBinding(path.node.left.name);

                if (!left) {
                    return;
                }

                const referencePaths = left.referencePaths;
                for (const reference of referencePaths) {
                    reference.replaceWith(path.node.right);
                }

                // remove the assignment
                path.remove();
            }
        }
    });
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
                path.remove();
            }
        }
    })

    return data
}

function replaceStrings(ast) {
    removeProxyAssignments(ast);

    let data = getStringData(ast);

    data = shuffleStrings(ast, data);
    replaceBCalls(ast, data);
}


module.exports = {
    replaceStrings
}