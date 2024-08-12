// initialize the unvisited source names with the roots, which are source names
// while there are unvisited source names
// - add it to the graph
// - get and parse the source (failure is a fatal error)
// - collect the direct imports
//   - convert each import to a source name using the context and remappings
//   - add the source name as a dependency of the current source name
//   - if the source name is not in the graph, add it to the unvisited set
// - collect the version pragmas
//   - covert each pragma to an interval representation
//   - form the conjunction of those intervals
//   - attach that to the source name in the graph

// for each root
// - determine the conjunction of its dependent's version intervals
// - select a compatible version from the allowed versions (failure is a fatal error)
// - store this with the root as the 'root version'
