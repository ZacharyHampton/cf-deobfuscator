const traverse = require("@babel/traverse").default;

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

module.exports = {
    removeProxyAssignments
};