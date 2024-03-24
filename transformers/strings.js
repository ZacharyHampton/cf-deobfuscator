const traverse = require("@babel/traverse").default;
const { Data } = require("dataclass");

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
                        path.stop();
                    }
                });
            }

            else if (path.node.id.name === "b") {
                path.traverse({
                    NumericLiteral(assignmentPath) {
                        data = data.copy({ offset: assignmentPath.node.value })
                        path.stop();
                    }
                });
            }
        }
    });

    return data;
}

module.exports = {
    getStringData
}