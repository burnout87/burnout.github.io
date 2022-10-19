# renku-aqs-graph-library

The functionalities implemented within the `graph_helper.js` javascript module enable the interation with the graph, as well as its graphical behavior. In particular:

* __graph drawing__: draw the graph starting from an export of the graph, currently `ttl` format is supported
* __graph user-interaction__: query the triples, and draw the relative nodes and edges, directly connected to the clicked node
* __graph customization__: various types of configuration can be applied:
  * __graphical__
  * __subset selection of nodes__
  * __absorption/expansion of nodes__

The module can be imported in the header as such:

```html
<script type="application/javascript" src="graph_helper.js"></script>
```

An exmaple code that uses this library can be found [here](index.html), and the relative live version can be found [here](https://odahub.io/renku-aqs-graph-library/).

Otherwise the [`aqs` renku plugin](https://github.com/oda-hub/renku-aqs/tree/cli-display-graph) makes usage of this library to build the interactive graph via the `show-graph` command.

The following javascript libraries have been used:

* [Vis netowrk](https://github.com/visjs/vis-network) - to provide the means to draw nodes and edges, with animations and various graphical customization
* [N3](https://github.com/rdfjs/N3.js/) - a library that offers the functionalities to handle RDF, in particular to 
perform operations of parsing, writing and storing triples in several various formats (eg Turtle, TriG, N-Triples, N-Quads to name some), 
* [Comunica](https://github.com/comunica/comunica) - for querying the graph
