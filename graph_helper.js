// initialize global variables and graph configuration
const graph_node_config_obj_default = {
    "default": {
        "shape": "box",
        "color": "#FFFFFF",
        "border": 0,
        "cellborder": 0,
        "config_file": null,
        "font": {
            "multi": "html",
            "face": "courier",
            "size": 24,
            "bold": {
                "size": 36
            }
        },
        "margin": 10
    }
}
const graph_edge_config_obj_default = {
    "default": {
        config_file: null,
        font: {
            "multi": "html",
            "face": "courier",
            "size": 24
        },
    }
}

let prefixes_graph = {};
const stack_promises = [];
var store_full_graph = new N3.Store();
var store_graph_to_explore = new N3.Store();
const myEngine = new Comunica.QueryEngine();
const query_initial_graph = `CONSTRUCT {

        ?activity a ?activityType ;
            <http://www.w3.org/ns/prov#startedAtTime> ?activityTime ;
            <https://swissdatasciencecenter.github.io/renku-ontology#command> ?activityCommand ;
            <https://swissdatasciencecenter.github.io/renku-ontology#argument> ?entityArgument .
    }
    WHERE { 
        
        ?activity a ?activityType ;
            <http://www.w3.org/ns/prov#startedAtTime> ?activityTime ;
            <https://swissdatasciencecenter.github.io/renku-ontology#command> ?activityCommand .
        
        OPTIONAL {?activity <https://swissdatasciencecenter.github.io/renku-ontology#argument> ?entityArgument }
    }`

const parser = new N3.Parser({ format: 'ttl' });

var ttl_content_pre;
var legend_content_main;
var context_menu;
var right_clicked_node;

function set_context_menu_style(context_menu_element, defaultColor, hoverColor) {
    context_menu_element.style.background = defaultColor;
    context_menu_element.addEventListener('mouseover', () => {
        context_menu_element.style.backgroundColor = hoverColor;
    });
    context_menu_element.addEventListener('mouseout', () => {
        context_menu_element.style.backgroundColor = defaultColor;
    });
  }

function hide_node_right_click_function() {
    hide_node();
    $(".custom-context-menu").hide(100);
}

function highlight_node_right_click_function() {
    hide_all_the_other_annotation_nodes();
    $(".custom-context-menu").hide(100);
}

function load_graph() {
    $('#right-click-hide-button').prop("disabled", true);
    // creating html of the context menu
    var context_menu = document.createElement("ul");
    context_menu.classList.add('custom-context-menu');

    var context_menu_eye_icon = document.createElement("i");
    context_menu_eye_icon.classList.add("bi");
    context_menu_eye_icon.classList.add("bi-eye-slash");
    context_menu_eye_icon.classList.add("me-1");

    let context_menu_text_hide_node = document.createElement("span");
    context_menu_text_hide_node.innerText = "Hide node";

    let context_menu_item_hide_node = document.createElement("li");
    context_menu_item_hide_node.appendChild(context_menu_eye_icon);
    context_menu_item_hide_node.appendChild(context_menu_text_hide_node);

    context_menu_item_hide_node.onclick = hide_node_right_click_function;

    let context_menu_stars_icon = document.createElement("i");
    context_menu_stars_icon.classList.add("bi");
    context_menu_stars_icon.classList.add("bi-stars");
    context_menu_stars_icon.classList.add("me-1");

    let context_menu_text_highlight_node = document.createElement("span");
    context_menu_text_highlight_node.innerText = "Highlight node";

    var context_menu_item_highlight_node = document.createElement("li");
    context_menu_item_highlight_node.appendChild(context_menu_stars_icon);
    context_menu_item_highlight_node.appendChild(context_menu_text_highlight_node);

    context_menu.appendChild(context_menu_item_hide_node);
    context_menu.appendChild(context_menu_item_highlight_node);

    context_menu_item_highlight_node.onclick = highlight_node_right_click_function;

    document.body.appendChild(context_menu);

    var coll = document.querySelectorAll('[class^="collapsible_vertical_"],[class*=" collapsible_vertical_"]');
    let i;
    for (i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function () {
            this.classList.toggle("active");
            let class_list = this.classList;
            for (j = 0; j < class_list.length; j++) {
                let class_element = class_list[j];
                if (class_element.startsWith('collapsible_vertical_')) {
                    let class_to_find = `content_${class_element}`;
                    let content_element = document.getElementsByClassName(class_to_find)[0];
                    if (content_element.style.maxHeight) {
                        content_element.style.maxHeight = null;
                    } else {
                        content_element.style.maxHeight = content_element.scrollHeight + "px";
                    }
                    break;
                }
            }
        });
    }

    coll = document.querySelectorAll('[class^="collapsible_horizontal"],[class*=" collapsible_horizontal"]');
    for (i = 0; i < coll.length; i++) {
        coll[i].addEventListener("click", function () {
            this.classList.toggle("active");
            let class_list = this.classList;
            for (j = 0; j < class_list.length; j++) {
                let class_element = class_list[j];
                if (class_element.startsWith('collapsible_horizontal_')) {
                    let class_to_find = `content_${class_element}`;
                    let content_element = document.getElementsByClassName(class_to_find)[0];
                    if (content_element.style.maxWidth) {
                        content_element.style.maxWidth = null;
                    } else {
                        content_element.style.maxWidth = content_element.scrollWidth + "px";
                    }
                    break;
                }
            }
        });
    }

    ttl_content_pre = document.createElement("pre");
    ttl_content_pre.classList.add("ttl_content_code");
    ttl_content_pre.innerText = graph_ttl_content;
    var ttl_content_container = document.getElementById("ttl_content");
    ttl_content_container.append(ttl_content_pre);

    ttl_content_pre.onmousedown = function dragMouseDown(e) {
        document.onmousemove = function onMouseMove(e) {
            if (ttl_content_pre.style.height !== "")
                ttl_content_container.style.maxHeight = ttl_content_container.style.height = Number(ttl_content_pre.style.height.substring(0, ttl_content_pre.style.height.length - 2)) + 10 + "px";
        }
        document.onmouseup = () => document.onmousemove = document.onmouseup = null;
    }

    var container = document.getElementById("mynetwork");

    let loader_container = document.createElement("div");
    loader_container.id = "loader";
    loader_container.classList.add("center");
    container.before(loader_container);

    // parsing and collecting nodes and edges from the python
    nodes = new vis.DataSet([]);
    edges = new vis.DataSet([]);

    // adding nodes and edges to the graph
    data = { nodes: nodes, edges: edges };

    if (window.options === null || window.options === undefined || $.isEmptyObject(window.options))
        window.options = {
            autoResize: true,
            nodes: {
                scaling: {
                    min: 10,
                    max: 30
                },
                font: {
                    size: 14,
                    face: "Tahoma",
                },
            },
            edges: {
                smooth: false,
                arrows: {
                    to: {
                        enabled: true,
                        scaleFactor: 1.2
                    }
                },
                width: 4

            },
            layout: {
                hierarchical: {
                    enabled: false
                }
            },
            interaction: {

            },
        };

    network = new vis.Network(container, data, options);

    if (graph_ttl_content == '')
        $.get("ttl_graph", function (data, status) {
            if (data != null) {
                try {
                    data = JSON.parse(data);
                    if ('graph_ttl_content' in data) {
                        graph_ttl_content = data['graph_ttl_content'];
                        ttl_content_pre.innerText = graph_ttl_content;
                    }
                    if ('graph_version' in data)
                        graph_version = data['graph_version'];
                } catch (e) {
                }
                parse_and_query_ttl_graph(graph_ttl_content);
                reset_legend();
            }
        });
    else {
        parse_and_query_ttl_graph(graph_ttl_content);
        // legend
        reset_legend();
    }

    network.on("stabilized", function (e) {
        stop_animation();
    });

    network.on("dragStart", function (e) {
        stop_animation();
        if (e.nodes[0])
            fix_release_nodes(false, e.nodes[0]);
    });

    network.on("oncontext", function (params) {
        params.event.preventDefault();
        right_clicked_node = network.getNodeAt(params.pointer.DOM);
        if (right_clicked_node !== undefined) {
            const right_clicked_node_obj = nodes.get(right_clicked_node);
            if (right_clicked_node_obj.hasOwnProperty("type_name")) {
                if (right_clicked_node_obj.type_name === 'Activity') {
                    set_context_menu_style(context_menu_item_highlight_node, "#FFF", "#DEF");
                    context_menu_item_highlight_node.onclick = highlight_node_right_click_function;
                }
                else {
                    set_context_menu_style(context_menu_item_highlight_node, "lightgray", "lightgray");
                    context_menu_item_highlight_node.onclick = () => false;
                }
            }

            const $customContextMenu = $(".custom-context-menu");
            const { pageX, pageY } = params.event;

            $customContextMenu
                .finish()
                .toggle(100)
                .css({
                    top: pageY + "px",
                    left: pageX + "px"
                });
        }
    });

    // If the document is clicked somewhere the context menu should disappear if visible
    $(document).bind("mousedown", function (e) {
        // If the clicked element is the menu hide it
        if (!$(e.target).parents(".custom-context-menu").length > 0) {
            $(".custom-context-menu").hide(100);
        }
    });

    network.on("click", function (e) {
        if (e.nodes[0]) {
            if (nodes.get(e.nodes[0])['clickable']) {
                let clicked_node = nodes.get(e.nodes[0]);
                if (!('expanded' in clicked_node) || !clicked_node['expanded']) {
                    nodes.update({
                        id: clicked_node.id,
                        expanded: true
                    });
                    // fix all the current nodes
                    fix_release_nodes();
                    let checkbox_reduction;
                    apply_invisibility_new_nodes = false;
                    if (clicked_node.hasOwnProperty("type_name")) {
                        checkbox_reduction = document.getElementById('reduction_config_' + clicked_node.type_name);
                    }
                    apply_invisibility_new_nodes = true;
                    (async () => {
                        const bindingsStreamCall = await myEngine.queryQuads(
                            format_query_clicked_node(clicked_node.id),
                            {
                                sources: [store_graph_to_explore]
                            }
                        );
                        bindingsStreamCall.on('data', (binding) => {
                            // console.log(binding.subject.id + " " + binding.predicate.id + " " + binding.object.id);
                            process_binding(binding, clicked_node, apply_invisibility_new_nodes);
                        });
                        bindingsStreamCall.on('end', () => {
                            // enable/disable subsets of nodes selection from the graph
                            for (let prefix_idx in prefixes_graph) {
                                let checkbox_config = document.getElementById(prefix_idx + '_filter');
                                if (checkbox_config !== null && !checkbox_config.checked) {
                                    let values_input = checkbox_config.value.split(",");
                                    for (let value_input_idx in values_input) {
                                        let nodes_to_filter = nodes.get({
                                            filter: function (item) {
                                                return (item.prefix === prefixes_graph[values_input[value_input_idx].trim()]);
                                            }
                                        });
                                        // nodes.remove(nodes_to_filter);
                                        nodes_to_filter.forEach(node => {
                                            nodes.update({ id: node.id, hidden: true, filtered_out: true });
                                        });
                                    }
                                }
                            }
                            //
                            // apply layout
                            let checked_radiobox = document.querySelector('input[name="graph_layout"]:checked');
                            toggle_layout(checked_radiobox);
                            //
                            // apply reductions
                            if (checkbox_reduction !== undefined &&
                                checkbox_reduction !== null &&
                                clicked_node.type_name in graph_reductions_obj) {
                                let reduction_subset = graph_reductions_obj[clicked_node.type_name];
                                let predicates_to_absorb_list = reduction_subset["predicates_to_absorb"].split(",");
                                let origin_node_list = nodes.get({
                                    filter: function (item) {
                                        return (item.id === clicked_node.id);
                                    }
                                });
                                if (checkbox_reduction.checked) {
                                    absorb_nodes(origin_node_list, predicates_to_absorb_list);
                                }
                            }
                            //
                            // show any hidden nodes
                            const hidden_nodes_ids = nodes.get({
                                filter: function (item) {
                                    return (item.hasOwnProperty("hidden") &&
                                        item.hidden === true &&
                                        item.filtered_out === false &&
                                        item.right_clicked_hidden === false);
                                }
                            });
                            hidden_nodes_ids.forEach(node => {
                                nodes.update({ id: node.id, hidden: false });
                            });
                            // remove edges that are not visible because one of the connected nodes has been removed
                            remove_unused_edges();
                        });
                        bindingsStreamCall.on('error', (error) => {
                            console.error(error);
                        });
                    })();
                }
                else {
                    let connected_to_nodes = network.getConnectedNodes(clicked_node.id);
                    let nodes_to_remove = [];
                    let edges_to_remove = [];
                    if (connected_to_nodes.length > 0) {
                        for (let i in connected_to_nodes) {
                            let connected_to_node = connected_to_nodes[i];
                            let connected_to_node_obj = nodes.get(connected_to_node);
                            let connected_to_connected_to_nodes = network.getConnectedNodes(connected_to_node);
                            if (!connected_to_node_obj.hidden && connected_to_connected_to_nodes.length >= 1) {
                                let absorb_node = true;
                                for (let j in connected_to_connected_to_nodes) {
                                    if (connected_to_connected_to_nodes[j] !== clicked_node.id) {
                                        let connected_to_connected_to_node_obj = nodes.get(connected_to_connected_to_nodes[j]);
                                        if (!connected_to_connected_to_node_obj.hidden)
                                            absorb_node = false;
                                    }
                                }
                                if (absorb_node) {
                                    nodes_to_remove.push(connected_to_node);
                                    edges_to_remove.push(...network.getConnectedEdges(connected_to_node));
                                }
                            }
                        }
                    }

                    let original_label = clicked_node.hasOwnProperty('original_label') ? clicked_node.original_label : clicked_node.label;
                    nodes.update({
                        id: clicked_node.id,
                        label: original_label,
                        child_nodes_list_content: [],
                        expanded: false
                    });

                    edges.remove(edges_to_remove);
                    nodes.remove(nodes_to_remove);
                }
            }
        }
    });


    // const container_configure = document.querySelector(".vis-configuration-wrapper");

    // if (container_configure) {
    //     container_configure.style.height = "300px";
    //     container_configure.style.overflow = "scroll";
    // }

    return network;
}

function parse_and_query_ttl_graph(ttl_data_to_parse) {
    console.log("started loading full graph");
    if (document.getElementById("loader") !== null)
        document.getElementById("loader").style.visibility = "visible";

    parsed_graph = parser.parse(ttl_data_to_parse,
        function (error, triple, prefixes) {
            // Always log errors
            if (error) {
                console.error(error);
            }
            if (triple) {
                // console.log(triple.subject.id + " " + triple.predicate.id + " " + triple.object.id);
                store_full_graph.addQuad(triple.subject, triple.predicate, triple.object);
            } else {
                prefixes_graph = prefixes;
                (async () => {
                    const bindingsStreamCallFullGraph = await myEngine.queryQuads(format_full_graph_query(),
                        {
                            sources: [store_full_graph]
                        }
                    );
                    bindingsStreamCallFullGraph.on('data', (binding) => {
                        // console.log(binding.subject.id + " " + binding.predicate.value + " ");
                        // console.log(binding.object);
                        store_graph_to_explore.addQuad(binding.subject, binding.predicate, binding.object);
                    });
                    bindingsStreamCallFullGraph.on('end', () => {
                        console.log("completed loading full graph");
                        if (graph_version !== '') {
                            start_timer_graph_version();
                            console.log("timer for the graph version started");
                        }
                        if (document.getElementById("loader") !== null)
                            document.getElementById("loader").style.display = "none";
                        (async () => {
                            const bindingsStreamCallInitialGraph = await myEngine.queryQuads(query_initial_graph,
                                {
                                    sources: [store_graph_to_explore]
                                }
                            );
                            bindingsStreamCallInitialGraph.on('data', (binding) => {
                                process_binding(binding);
                            });
                            bindingsStreamCallInitialGraph.on('end', () => {
                                let checked_radiobox = document.querySelector('input[name="graph_layout"]:checked');
                                toggle_layout(checked_radiobox);
                            });
                            bindingsStreamCallInitialGraph.on('error', (error) => {
                                console.error(error);
                            });
                        })();
                    });
                    bindingsStreamCallFullGraph.on('error', (error) => {
                        console.error(error);
                    });
                })();
            }

        }
    );

}

function fit_graph() {
    network.fit();
}

function enable_filter(check_box_element) {
    let values_input = check_box_element.value.split(",");
    for (let value_input_idx in values_input) {
        let nodes_to_filter = nodes.get({
            filter: function (item) {
                return (item.prefix === prefixes_graph[values_input[value_input_idx].trim()]);
            }
        });
        nodes_to_filter.forEach(node => {
            nodes.update({ id: node.id, hidden: !check_box_element.checked, filtered_out: !check_box_element.checked });
        });
    }
}

function toggle_layout(radio_box_element) {
    let layout_id = radio_box_element.id;
    let layout_name = layout_id.split("_")[0];
    apply_layout(layout_name);
}

function apply_layout(layout_name) {
    switch (layout_name) {
        case "hierarchical":
            network.setOptions(
                {
                    edges: {
                        smooth: false
                    },
                    layout: {
                        hierarchical: {
                            enabled: true,
                            levelSeparation: 300,
                            sortMethod: "directed",
                            nodeSpacing: 150
                        }
                    },
                    physics: {
                        enabled: true,
                        minVelocity: 0.75,
                        timestep: 0.35,
                        maxVelocity: 100,
                        solver: "hierarchicalRepulsion",
                        hierarchicalRepulsion: {
                            nodeDistance: 250,
                        },
                        stabilization: {
                            enabled: true,
                            updateInterval: 25,
                            iterations: 1000
                        },
                    }
                }
            );
            break;

        case "repulsion":
            network.setOptions(
                {
                    edges: {
                        smooth: false
                    },
                    layout: {
                        "hierarchical": {
                            "enabled": false
                        }
                    },
                    physics: {
                        enabled: true,
                        minVelocity: 0.75,
                        timestep: 0.35,
                        maxVelocity: 100,
                        solver: "repulsion",
                        repulsion: {
                            nodeDistance: 350,
                            centralGravity: 1.05,
                            springConstant: 0.05,
                            springLength: 250
                        },
                        stabilization: {
                            enabled: true,
                            updateInterval: 25,
                            iterations: 1000
                        },
                    }
                }
            );
            break;

        default:
            network.setOptions(options);
    }
}

function remove_unused_edges() {
    // remove edges that are not visible because one of the connected nodes has been removed
    let edges_to_remove = edges.get({
        filter: function (item) {
            return (nodes.get(item.from) === null || nodes.get(item.to) === null);
        }
    });
    edges.remove(edges_to_remove);
}



function reset_legend() {
    let span_config_list = document.querySelectorAll('[id^="span_"]');
    for (i = 0; i < span_config_list.length; i++) {
        span_config_list[i].remove();
    }

    // get list of classes in the graph
    let types_array = [];

    (async () => {
        const bindingsStreamCall = await myEngine.queryBindings(`
        SELECT DISTINCT ?s_type_extracted
        {
            ?s rdf:type ?s_type .
            
            BIND(STRAFTER(STR(?s_type), "#") AS ?s_type_extracted) .
        }`,
            {
                sources: [store_full_graph],
            });

        bindingsStreamCall.on('data', (binding) => {
            types_array.push(binding.get('s_type_extracted').value);
        });
        bindingsStreamCall.on('end', () => {
            build_legend(types_array)
        });
        bindingsStreamCall.on('error', (error) => {
            console.error(error);
            build_legend(null);
        });
    })();

}

function build_legend(types_array) {
    let legend_content = document.createElement("ul");
    legend_content.classList.add("legend_content");
    // let legend_content = document.getElementById('legend_content');
    for (let config in nodes_graph_config_obj) {
        let check_box_config = document.getElementById('config_' + nodes_graph_config_obj[config]['config_file']);
        if (check_box_config && check_box_config.checked && (types_array === null || types_array.indexOf(config) > -1)) {
            let legend_label = config;

            let outer_li = document.createElement("li");
            outer_li.setAttribute("id", `span_${config}`);
            outer_li.setAttribute("style", "position: relative; margin: 5px; font-size: small;");
            outer_li.setAttribute("title", legend_label)
            outer_li.classList.add("legend_item")

            let color_span = document.createElement("span");
            let color = nodes_graph_config_obj[config]['color'];
            color_span.setAttribute("style", `margin-top: 3px; border-style: solid; border-width: 1px; width: 14px; height: 14px; display: inline-block; position: absolute; background-color: ${color};`);

            let name_span = document.createElement("span");
            name_span.setAttribute("style", "margin-left: 20px;");

            if (nodes_graph_config_obj[config].hasOwnProperty("displayed_type_name")) {
                let ele = document.createElement("div");
                ele.innerHTML = nodes_graph_config_obj[config].displayed_type_name;
                legend_label = ele.textContent;
            }

            name_span.innerText = legend_label;

            outer_li.appendChild(color_span);
            outer_li.appendChild(name_span);

            legend_content.append(outer_li);
        }
    }

    const legend_content_container = document.getElementById("legend_container");
    legend_content_container.innerHTML = legend_content.outerHTML;
}

function toggle_graph_config(check_box_element) {
    let checked_config_id = check_box_element.id;
    let edges_graph_config_obj_asArray = Object.entries(edges_graph_config_obj);
    let edge_config_subset = edges_graph_config_obj_asArray.filter(config => 'config_' + config[1].config_file === checked_config_id);
    if (check_box_element.checked) {
        let nodes_graph_config_obj_asArray = Object.entries(nodes_graph_config_obj);
        let node_config_subset = nodes_graph_config_obj_asArray.filter(config => 'config_' + config[1].config_file === checked_config_id);
        for (let config_idx in node_config_subset) {
            // let node_properties = node_config_subset[config_idx][1];
            let node_properties = { ...graph_node_config_obj_default['default'], ...node_config_subset[config_idx][1] };
            let nodes_to_update = nodes.get({
                filter: function (node) {
                    type_key_splitted = node_config_subset[config_idx][0].split(",");
                    return (type_key_splitted.indexOf(node.type_name) > -1);
                }
            });
            // update_nodes(nodes_to_update, node_properties);
            for (let i in nodes_to_update) {
                node_to_update_id = nodes_to_update[i]['id'];
                nodes.update({
                    id: node_to_update_id,
                    color: node_properties['color'],
                    border: node_properties['border'],
                    cellborder: node_properties['cellborder'],
                    shape: node_properties['shape'],
                    config_file: node_properties['config_file'],
                    label: nodes_to_update[i]['original_label'],
                    font: node_properties['font']
                });
            }
        }
        for (let config_idx in edge_config_subset) {
            // let edge_properties = edge_config_subset[config_idx][1];
            let edge_properties = { ...graph_edge_config_obj_default['default'], ...edge_config_subset[config_idx][1] };
            // edge_properties['label'] = edge_properties.hasOwnProperty('displayed_type_name') ? edge_properties['displayed_type_name'] : literal_predicate;
            let edges_to_update = edges.get({
                filter: function (edge) {
                    return (edge.original_label === edge_config_subset[config_idx][0]);
                }
            });
            for (let i in edges_to_update) {
                edge_to_update_id = edges_to_update[i]['id'];
                let custom_label = edge_properties['displayed_type_name'];
                edges.update({
                    id: edge_to_update_id,
                    font: edge_properties['font'],
                    label: custom_label,
                    config_file: edge_properties['config_file']
                });
            }
        }
    } else {
        let nodes_to_update = nodes.get({
            filter: function (node) {
                return ('config_' + node.config_file === checked_config_id);
            }
        });
        let node_properties = graph_node_config_obj_default['default'];
        for (let i in nodes_to_update) {
            node_to_update_id = nodes_to_update[i]['id'];
            nodes.update({
                id: node_to_update_id,
                color: node_properties['color'],
                border: node_properties['border'],
                cellborder: node_properties['cellborder'],
                shape: node_properties['shape'],
                config_file: node_properties['config_file'],
                label: nodes_to_update[i]['default_label'],
                font: node_properties['font']
            });
        }

        let edge_properties = graph_edge_config_obj_default['default'];
        let edges_to_update = edges.get({
            filter: function (edge) {
                return ('config_' + edge.config_file === checked_config_id);
            }
        });
        // update_edges(edges_to_update, edge_properties);
        for (let i in edges_to_update) {
            edge_to_update_id = edges_to_update[i]['id'];
            let original_label = edges_to_update[i]['original_label'];
            edges.update({
                id: edge_to_update_id,
                font: edge_properties['font'],
                label: original_label,
                config_file: edge_properties['config_file']
            });
        }

    }
    reset_legend();
}

function stop_animation() {
    if (network.physics.options.enabled)
        network.setOptions({ "physics": { enabled: false } });
}

function show_right_clicked_hidden_nodes() {
    // show any hidden nodes
    const right_click_hidden_nodes_ids = nodes.get({
        filter: function (item) {
            return (item.right_clicked_hidden &&
                item.hasOwnProperty("hidden") && item.hidden &&
                item.filtered_out === false);
        }
    });
    right_click_hidden_nodes_ids.forEach(node => {
        nodes.update({
            id: node.id,
            hidden: false,
            right_clicked_hidden: false,

        });
    });

    $('#right-click-hide-button').prop("disabled", true);
}

function hide_all_the_other_annotation_nodes() {
    // let right_clicked_node_obj = nodes.get(right_clicked_node);

    let activity_node_list = nodes.get({
        filter: function (item) {
            return (item.hasOwnProperty("type_name") && item.type_name == "Activity" && item.id != right_clicked_node);
        }
    });

    activity_node_list.forEach(node => {
        hide_node(node.id);
    });
}

// // Function to check if there is an edge between two nodes
// function isEdgeBetweenNodes(node1, node2) {
//     const connectedEdges1 = network.getConnectedEdges(node1);
//     return connectedEdges1.includes(node2);
//   }

function recursively_get_nodes_to_remove_during_hide(node_to_hide, parent_node) {
    let connected_to_nodes_to_remove = [];
    console.log(node_to_hide);
    let connected_to_nodes = network.getConnectedNodes(node_to_hide);
    if (connected_to_nodes.length == 1 && connected_to_nodes[0] == parent_node)
        connected_to_nodes_to_remove.push(node_to_hide);
    else {
        for (let i in connected_to_nodes) {
            let connected_to_node = connected_to_nodes[i];
            if(connected_to_node !== parent_node) {
                let connected_to_connected_to_nodes = network.getConnectedNodes(connected_to_node);
                if (connected_to_connected_to_nodes.length == 1 && connected_to_connected_to_nodes[0] == node_to_hide)
                    connected_to_nodes_to_remove.push(connected_to_node);
                else
                    for (let j in connected_to_connected_to_nodes)
                        connected_to_nodes_to_remove.push(...recursively_get_nodes_to_remove_during_hide(connected_to_connected_to_nodes[j], connected_to_node));
            }
        }
    }
    let remove_node_to_hide = true;
    if (!connected_to_nodes_to_remove.includes(node_to_hide) && connected_to_nodes_to_remove.length !== (connected_to_nodes.length - 1))
        for (let i in connected_to_nodes)
            if (connected_to_nodes[i] !== parent_node && !connected_to_nodes[i] in connected_to_nodes_to_remove)
                remove_node_to_hide == false;
                
    if (remove_node_to_hide)        
        connected_to_nodes_to_remove.push(node_to_hide);

    return connected_to_nodes_to_remove;
}

function hide_node(node_to_hide) {
    if (node_to_hide === undefined)
        node_to_hide = right_clicked_node;
    let node_to_hide_obj = nodes.get(node_to_hide);
    let connected_to_nodes = network.getConnectedNodes(node_to_hide);
    let nodes_to_remove = [];
    // let edges_to_remove = [...network.getConnectedEdges(right_clicked_node)];
    let edges_to_remove = [];
    if (connected_to_nodes.length > 0) {
        for (let i in connected_to_nodes) {
            // nodes_to_remove.push(...recursively_get_nodes_to_remove_during_hide(connected_to_nodes[i], node_to_hide));
            let connected_to_node = connected_to_nodes[i];
            let connected_to_node_obj = nodes.get(connected_to_node);

            let connected_to_connected_to_nodes = network.getConnectedNodes(connected_to_node);
            if (!connected_to_node_obj.hidden && connected_to_connected_to_nodes.length >= 1) {
                let right_click_hide_node = true;
                for (let j in connected_to_connected_to_nodes) {
                    if (connected_to_connected_to_nodes[j] !== node_to_hide) {
                        let connected_to_connected_to_node_obj = nodes.get(connected_to_connected_to_nodes[j]);
                        if (!connected_to_connected_to_node_obj.hidden)
                            right_click_hide_node = false;
                    }
                }
                if (right_click_hide_node) {
                    nodes_to_remove.push(connected_to_node);
                    edges_to_remove.push(...network.getConnectedEdges(connected_to_node));
                }
            }
        }
    }

    let original_label = node_to_hide_obj.hasOwnProperty('original_label') ? node_to_hide_obj.original_label : node_to_hide_obj.label;
    nodes.update({
        id: node_to_hide,
        label: original_label,
        child_nodes_list_content: [],
        expanded: false,
        hidden: true,
        right_clicked_hidden: true
    });

    edges.remove(edges_to_remove);
    nodes.remove(nodes_to_remove);
    remove_unused_edges();

    $('#right-click-hide-button').prop("disabled", false);
}

function absorb_nodes(origin_node_list, predicates_to_absorb_list) {
    for (i in origin_node_list) {
        let origin_node = origin_node_list[i];
        let connected_edges = network.getConnectedEdges(origin_node.id);
        let new_label = origin_node.label;
        let child_nodes_list_content = []
        for (j in connected_edges) {
            let connected_edge = edges.get(connected_edges[j]);
            if (predicates_to_absorb_list.indexOf(connected_edge.title) > -1) {
                let edge_nodes = network.getConnectedNodes(connected_edges[j]);
                let node_removed = nodes.get(edge_nodes[1]);
                if (edge_nodes[0] == origin_node.id) {
                    let connected_edges_node_to_remove = network.getConnectedEdges(edge_nodes[1]);
                    if (connected_edges_node_to_remove.length == 1)
                        nodes.remove(edge_nodes[1]);
                }
                else {
                    node_removed = nodes.get(edge_nodes[0]);
                    let connected_edges_node_to_remove = network.getConnectedEdges(edge_nodes[0]);
                    if (connected_edges_node_to_remove.length == 1)
                        nodes.remove(edge_nodes[0]);
                }
                edges.remove(connected_edges[j]);
                if (origin_node.hasOwnProperty('child_nodes_list_content'))
                    child_nodes_list_content = origin_node.child_nodes_list_content;
                let node_removed_str = JSON.stringify(node_removed);
                let edge_removed_str = JSON.stringify(connected_edge);
                let matching_node_list_content = child_nodes_list_content.filter(function (el) {
                    return (el[0].indexOf('"id":"' + node_removed.id + '",') > -1 &&
                        el[1].indexOf('"id":"' + connected_edge.id + '",') > -1);
                });
                if (matching_node_list_content.length == 0) {
                    child_nodes_list_content.push([node_removed_str, edge_removed_str]);
                    let label_to_add = '\n' + node_removed.displayed_type_name + ': ' +
                        node_removed.label.replaceAll('\n', '')
                            .replaceAll(node_removed.displayed_type_name, '');
                    new_label += label_to_add;
                }
                origin_node = nodes.get(origin_node.id);
            }
        }
        nodes.update({
            id: origin_node.id,
            label: new_label,
            child_nodes_list_content: child_nodes_list_content
        });
    }
}

function apply_reduction_change(check_box_element) {
    let checked_reduction_id = check_box_element.id.replace("reduction_config_", "");

    if (checked_reduction_id in graph_reductions_obj) {
        let origin_node_list = nodes.get({
            filter: function (item) {
                return (item.hasOwnProperty("type_name") && item.type_name == checked_reduction_id);
            }
        });
        if (check_box_element.checked) {
            let reduction_subset = graph_reductions_obj[checked_reduction_id];
            let predicates_to_absorb_list = reduction_subset["predicates_to_absorb"].split(",");
            absorb_nodes(origin_node_list, predicates_to_absorb_list);
        } else {
            fix_release_nodes();
            for (i in origin_node_list) {
                // fix all the current nodes
                let origin_node = origin_node_list[i];
                if (origin_node.hasOwnProperty('child_nodes_list_content') &&
                    origin_node.child_nodes_list_content.length > 0) {
                    draw_child_nodes(origin_node);
                }
            }
            let checked_radiobox = document.querySelector('input[name="graph_layout"]:checked');
            toggle_layout(checked_radiobox);
        }
    }
}

function draw_child_nodes(origin_node) {
    let position_origin_node = network.getPosition(origin_node.id);
    for (j in origin_node.child_nodes_list_content) {
        let child_node_obj = JSON.parse(origin_node.child_nodes_list_content[j][0]);
        let edge_obj = JSON.parse(origin_node.child_nodes_list_content[j][1]);
        child_node_obj['x'] = position_origin_node.x;
        child_node_obj['y'] = position_origin_node.y;
        child_node_obj['hidden'] = false;
        if (!nodes.get(child_node_obj.id))
            nodes.add([child_node_obj]);
        if (!edges.get(edge_obj.id))
            edges.add([edge_obj]);
    }
    nodes.update({
        id: origin_node.id,
        label: origin_node.original_label,
        child_nodes_list_content: []
    });
}

function start_timer_graph_version() {
    setInterval(query_graph_version, 1000);
}

function query_graph_version() {
    $.get("graph_version", function (data, status) {
        if (data != null && graph_version !== data) {
            console.log("graph version check detected a new graph version, the graph will be refreshed");
            refresh_graph();
        }
    });
}

function refresh_graph() {
    window.location.reload();
}

function reset_graph() {
    nodes.clear();
    edges.clear();

    (async () => {
        const bindingsStreamCall = await myEngine.queryQuads(query_initial_graph,
            {
                sources: [store_graph_to_explore]
            }
        );
        bindingsStreamCall.on('data', (binding) => {
            process_binding(binding);
        });
        bindingsStreamCall.on('end', () => {
            let checked_radiobox = document.querySelector('input[name="graph_layout"]:checked');
            toggle_layout(checked_radiobox);
        });
        bindingsStreamCall.on('error', (error) => {
            console.error(error);
        });
    })();

}

function extract_info_string(string_to_parse) {
    idx_slash = string_to_parse.lastIndexOf("/");
    substr_q = string_to_parse.slice(idx_slash + 1);
    if (substr_q) {
        idx_hash = substr_q.indexOf("#");
        if (idx_hash) {
            let type_name = substr_q.slice(idx_hash + 1);
            return [type_name, string_to_parse.replace(type_name, '')];
        }
    }
}

function format_full_graph_query() {

    let construct_query_full_graph = `CONSTRUCT {
    ?entityOutput a <https://swissdatasciencecenter.github.io/renku-ontology#CommandOutput> ;
        <http://www.w3.org/ns/prov#atLocation> ?entityOutputLocation ;
        <https://swissdatasciencecenter.github.io/renku-ontology#checksum> ?entityOutputChecksum .
        
    ?entityInput a <http://www.w3.org/ns/prov#EntityInput> ;
        <http://www.w3.org/ns/prov#atLocation> ?entityInputLocation ;
        <https://swissdatasciencecenter.github.io/renku-ontology#checksum> ?entityInputChecksum .
    
    ?activity a ?activityType ;
        <http://www.w3.org/ns/prov#startedAtTime> ?activityTime ;
        <https://swissdatasciencecenter.github.io/renku-ontology#hasInputs> ?entityInput ;
        <https://swissdatasciencecenter.github.io/renku-ontology#command> ?activityCommand ;
        <https://swissdatasciencecenter.github.io/renku-ontology#hasOutputs> ?entityOutput ;
        <https://swissdatasciencecenter.github.io/renku-ontology#argument> ?entityArgument .
        
        `

    let where_query_full_graph = `WHERE {

        ?entityInput a <http://www.w3.org/ns/prov#Entity> ;
            <http://www.w3.org/ns/prov#atLocation> ?entityInputLocation ;
            <https://swissdatasciencecenter.github.io/renku-ontology#checksum> ?entityInputChecksum .
                    
        ?entityOutput a <http://www.w3.org/ns/prov#Entity> ; 
            <http://www.w3.org/ns/prov#qualifiedGeneration>/<http://www.w3.org/ns/prov#activity> ?activity ;
            <http://www.w3.org/ns/prov#atLocation> ?entityOutputLocation ;
            <https://swissdatasciencecenter.github.io/renku-ontology#checksum> ?entityOutputChecksum .
    
        ?activity a ?activityType ;
            <http://www.w3.org/ns/prov#startedAtTime> ?activityTime ;
            <http://www.w3.org/ns/prov#qualifiedAssociation>/<http://www.w3.org/ns/prov#hadPlan>/<https://swissdatasciencecenter.github.io/renku-ontology#command> ?activityCommand ;
            <http://www.w3.org/ns/prov#qualifiedUsage>/<http://www.w3.org/ns/prov#entity> ?entityInput .

        OPTIONAL 
        {
        
 `

    for (const [key, value] of Object.entries(subset_nodes_config_obj)) {
        if ('query_construct' in value && value['query_construct'] !== undefined
            && 'query_where' in value && value['query_where'] !== undefined) {
            construct_query_full_graph += value['query_construct'];
            where_query_full_graph += value['query_where'];
        }
    }

    construct_query_full_graph += `}`;
    where_query_full_graph += `}
        OPTIONAL {
            {
                SELECT ?activity (GROUP_CONCAT(?entityArgumentPrefixedDefaultValue; separator=" ") AS ?entityArgument) 
                WHERE 
                {
                    {
                        SELECT ?activity (CONCAT(IF(BOUND(?entityArgumentPrefix), ?entityArgumentPrefix, "")," ",?entityArgumentDefaultValue) AS ?entityArgumentPrefixedDefaultValue) ?entityArgumentDefaultValue
                        WHERE {
                            OPTIONAL {
                                ?activity <http://www.w3.org/ns/prov#qualifiedAssociation>/
                                        <http://www.w3.org/ns/prov#hadPlan>/
                                        <https://swissdatasciencecenter.github.io/renku-ontology#hasArguments> ?argument .
                            
                                ?argument <https://swissdatasciencecenter.github.io/renku-ontology#position> ?entityArgumentPosition ;
                                        <http://schema.org/defaultValue> ?entityArgumentDefaultValue .
        
                                OPTIONAL {
                                    ?argument <https://swissdatasciencecenter.github.io/renku-ontology#prefix> ?entityArgumentPrefix .
                                }
                            }
                        
                        }
                        ORDER BY ASC(?entityArgumentPosition)
                    }
                }
                GROUP BY ?activity
            }
        }
    }`

    return construct_query_full_graph + where_query_full_graph;

}


function format_query_clicked_node(clicked_node_id) {

    let query = `CONSTRUCT {
            ?s ?p <${clicked_node_id}> ;
                a ?s_type ;
                ?p_literal ?s_literal .
            
            <${clicked_node_id}> ?p ?o .
            ?o a ?o_type . 
            ?o ?p_literal ?o_literal .
        
            ?activity a ?activityType ;
                <http://www.w3.org/ns/prov#startedAtTime> ?activityTime ;
                <https://swissdatasciencecenter.github.io/renku-ontology#command> ?activityCommand .
        }
        WHERE {

            {
                ?s ?p <${clicked_node_id}> .
                
                OPTIONAL {
                    ?s a ?s_type .
                    ?s ?p_literal ?s_literal .
                    FILTER isLiteral(?s_literal) .
                }
            }
            UNION
            {
                ?s ?p <${clicked_node_id}> .
                
                OPTIONAL {
                    ?s a ?s_type .
                    ?s ?p_literal ?s_literal .
                    FILTER isNumeric(?s_literal) .
                }
            }
            UNION
            {
                <${clicked_node_id}> ?p ?o .
                
                OPTIONAL {
                    ?o a ?o_type .
                    ?o ?p_literal ?o_literal .
                    FILTER isLiteral(?o_literal) .
                }
            }
            UNION
            {
                <${clicked_node_id}> ?p ?o .
                
                OPTIONAL {
                    ?o a ?o_type .
                    ?o ?p_literal ?o_literal .
                    FILTER isNumeric(?o_literal) .
                }
            }
            UNION
            {
                     
                ?activity a ?activityType ;
                    <http://www.w3.org/ns/prov#startedAtTime> ?activityTime ;
                    <https://swissdatasciencecenter.github.io/renku-ontology#command> ?activityCommand .
                
                FILTER (?activity = <${clicked_node_id}>) .
                
            }
        }`;

    return query
}

function fix_release_nodes(fix, node_id) {
    if (fix === undefined)
        fix = true;
    if (node_id === undefined)
        nodes.forEach(node => {
            nodes.update({ id: node.id, fixed: fix });
        });
    else
        nodes.update({ id: node_id, fixed: fix });
}

function process_binding(binding, clicked_node, apply_invisibility_new_nodes) {
    if (apply_invisibility_new_nodes === undefined || apply_invisibility_new_nodes === null)
        apply_invisibility_new_nodes = false;

    let subj_id = binding.subject.id ? binding.subject.id : binding.subject.value;
    let obj_id = binding.object.id ? binding.object.id : binding.object.value;
    let edge_id = subj_id + "_" + obj_id;

    subj_node = {
        id: subj_id,
        label: binding.subject.value ? binding.subject.value : binding.subject.id,
        original_label: binding.subject.value ? binding.subject.value : binding.subject.id,
        title: subj_id,
        clickable: true,
        filtered_out: false,
        right_clicked_hidden: false,
        color: graph_node_config_obj_default['default']['color'],
        shape: graph_node_config_obj_default['default']['shape'],
        border: graph_node_config_obj_default['default']['border'],
        cellborder: graph_node_config_obj_default['default']['cellborder'],
        config_file: graph_node_config_obj_default['default']['config_file'],
        margin: graph_node_config_obj_default['default']['margin'],
        hidden: apply_invisibility_new_nodes,
        font: {
            'multi': "html",
            'face': "courier",
        }
    }
    edge_obj = {
        id: edge_id,
        from: subj_id,
        to: obj_id,
        config_file: graph_edge_config_obj_default['default']['config_file'],
        title: binding.predicate.value
    }
    obj_node = {
        id: obj_id,
        label: binding.object.value ? binding.object.value : binding.object.id,
        original_label: binding.object.value ? binding.object.value : binding.object.id,
        title: obj_id,
        clickable: true,
        filtered_out: false,
        right_clicked_hidden: false,
        color: graph_node_config_obj_default['default']['color'],
        shape: graph_node_config_obj_default['default']['shape'],
        border: graph_node_config_obj_default['default']['border'],
        cellborder: graph_node_config_obj_default['default']['cellborder'],
        config_file: graph_node_config_obj_default['default']['config_file'],
        margin: graph_node_config_obj_default['default']['margin'],
        hidden: apply_invisibility_new_nodes,
        font: {
            'multi': "html",
            'face': "courier",
        }
    }

    if (clicked_node !== undefined) {
        let position_clicked_node = network.getPosition(clicked_node.id);

        subj_node['x'] = position_clicked_node.x;
        subj_node['y'] = position_clicked_node.y;

        obj_node['x'] = position_clicked_node.x;
        obj_node['y'] = position_clicked_node.y;
    }

    if (!nodes.get(subj_id))
        nodes.add([subj_node]);

    if (binding.predicate.value.endsWith('#type')) {
        // extract type name
        let info_obj = extract_info_string(obj_id);;
        let type_name = info_obj[0];
        let prefix = info_obj[1];
        let subj_node_to_update = nodes.get(subj_id);
        // check type_name property of the node ahs already been defined previously
        if (subj_node_to_update !== null && !('type_name' in subj_node_to_update)) {
            let nodes_graph_config_obj_type_entry = undefined;
            Object.keys(nodes_graph_config_obj).forEach(type_key => {
                type_key_splitted = type_key.split(",").map(s => s.trim());
                if (type_key_splitted != undefined && type_key_splitted.indexOf(type_name) > -1)
                    nodes_graph_config_obj_type_entry = nodes_graph_config_obj[type_key];
            });
            let node_properties = { ...graph_node_config_obj_default['default'], ... (nodes_graph_config_obj_type_entry ? nodes_graph_config_obj_type_entry : graph_node_config_obj_default['default']) };
            // displayed_literals_format:defaultValue:yes/defaultValue:no
            // displayed_information:title/literals/both
            cleaned_title = type_name;
            if ('displayed_type_name' in node_properties) {
                let ele = document.createElement("div");
                ele.innerHTML = node_properties['displayed_type_name'];
                cleaned_title = ele.textContent;
            }
            if ('displayed_information' in node_properties) {
                switch (node_properties['displayed_information']) {
                    case 'title':
                    case 'both':
                        if ('displayed_type_name' in node_properties)
                            subj_node_to_update['label'] = `<b>${node_properties['displayed_type_name']}</b>\n`;
                        else
                            subj_node_to_update['label'] = `<b>${type_name}</b>\n`;
                        break;
                    case 'literals':
                        subj_node_to_update['label'] = '';
                        break;
                }

                if ('displayed_type_name' in node_properties)
                    subj_node_to_update['title'] = cleaned_title;
                else
                    subj_node_to_update['title'] = type_name;
            } else {
                if ('displayed_type_name' in node_properties) {
                    subj_node_to_update['label'] = `<b>${node_properties['displayed_type_name']}</b>\n`;
                    subj_node_to_update['title'] = cleaned_title;
                }
                else {
                    subj_node_to_update['label'] = `<b>${type_name}</b>\n`;
                    subj_node_to_update['title'] = cleaned_title;
                }
            }
            let default_label = `<b>${type_name}</b>\n`;
            let original_label = subj_node_to_update['label'];
            let config_value = node_properties['config_file'];
            let checkbox_config = document.getElementById('config_' + config_value);
            if (checkbox_config && !checkbox_config.checked) {
                node_properties = graph_node_config_obj_default['default'];
                subj_node_to_update['label'] = default_label;
            }
            nodes.update({
                id: subj_id,
                label: subj_node_to_update['label'],
                default_label: default_label,
                original_label: original_label,
                title: subj_node_to_update['title'],
                type_name: type_name,
                prefix: prefix,
                displayed_type_name: node_properties['displayed_type_name'] ? node_properties['displayed_type_name'] : type_name,
                color: node_properties['color'],
                border: node_properties['border'],
                cellborder: node_properties['cellborder'],
                shape: node_properties['shape'],
                config_file: node_properties['config_file'],
                font: node_properties['font']
            });
        }
    }
    else {
        //
        let literal_predicate_index = edge_obj['title'].lastIndexOf("/");
        let literal_predicate = edge_obj['title'].slice(literal_predicate_index + 1);
        if (literal_predicate) {
            idx_hash = literal_predicate.indexOf("#");
            if (idx_hash)
                literal_predicate = literal_predicate.slice(idx_hash + 1);
        }
        if (literal_predicate) {
            edge_obj['prefix'] = edge_obj['title'].replace(literal_predicate, '');
            edge_obj['title'] = literal_predicate;
        }
        if (!edges.get(edge_id)) {

            let edge_properties = { ...graph_edge_config_obj_default['default'], ... (edges_graph_config_obj[edge_obj['title']] ? edges_graph_config_obj[edge_obj['title']] : graph_edge_config_obj_default['default']) };
            edge_obj['original_label'] = literal_predicate;
            edge_obj['label'] = edge_properties.hasOwnProperty('displayed_type_name') ? edge_properties['displayed_type_name'] : literal_predicate;
            edge_obj['font'] = edge_properties['font'];
            edge_obj['config_file'] = edge_properties['config_file'];

            edges.add([edge_obj]);
        }
        if (!nodes.get(obj_id)) {
            if (binding.object.termType === "Literal") {
                subj_node_to_update = nodes.get(subj_id);
                if (subj_node_to_update !== null) {
                    literal_predicate_index = edge_obj['title'].lastIndexOf("/");
                    literal_predicate = edge_obj['title'].slice(literal_predicate_index + 1);
                    if (literal_predicate) {
                        idx_hash = literal_predicate.indexOf("#");
                        if (idx_hash)
                            literal_predicate = literal_predicate.slice(idx_hash + 1);
                    }

                    let literal_label = '';
                    let default_literal_label = '';
                    let original_literal_label = '';
                    let node_properties = undefined;
                    if (subj_node_to_update !== null && 'type_name' in subj_node_to_update) {
                        let type_name = subj_node_to_update['type_name'];
                        let nodes_graph_config_obj_type_entry = undefined;
                        Object.keys(nodes_graph_config_obj).forEach(type_key => {
                            type_key_splitted = type_key.split(",");
                            if (type_key_splitted.indexOf(type_name) > -1)
                                nodes_graph_config_obj_type_entry = nodes_graph_config_obj[type_key];
                        });

                        node_properties = { ...graph_node_config_obj_default['default'], ... (nodes_graph_config_obj_type_entry ? nodes_graph_config_obj_type_entry : graph_node_config_obj_default['default']) };
                        // displayed_literals_format: defaultValue:yes / defaultValue:no
                        // displayed_information: title / literals / both
                        // literals_keyword_to_substitute: title:get_images,query_object,query_region (search keywords to substitue eg title, withn a certain literal and apply substitution)
                        if ('literals_keyword_to_substitute' in node_properties) {
                            let literals_keyword_to_substitute = node_properties['literals_keyword_to_substitute'].split(";");
                            for (let i in literals_keyword_to_substitute) {
                                let literal_for_substitution = literals_keyword_to_substitute[i].split(":");
                                if (literal_for_substitution[0] === literal_predicate) {
                                    let keywords_substitution_list = literal_for_substitution[1].split(",");
                                    for (let j in keywords_substitution_list) {
                                        let keyword = keywords_substitution_list[j];
                                        if (obj_node['label'].indexOf(keyword) > -1) {
                                            obj_node['label'] = keyword;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        default_literal_label = literal_predicate + ': ' + obj_node['label'];
                        if ('displayed_information' in node_properties && node_properties['displayed_information'] !== "title" &&
                            'displayed_literals_format' in node_properties) {
                            if (node_properties['displayed_literals_format'].indexOf(`${literal_predicate}:`) > -1) {
                                let literals_display_config = node_properties['displayed_literals_format'].split(",");
                                for (let i in literals_display_config) {
                                    let literal_config = literals_display_config[i].split(":");
                                    if (literal_config[0] === literal_predicate) {
                                        switch (literal_config[1]) {
                                            case "yes":
                                                literal_label = literal_predicate + ': ' + obj_node['label'];
                                                break;
                                            case "no":
                                                literal_label = obj_node['label'];
                                                break;
                                            default:
                                                literal_label = literal_predicate + ': ' + obj_node['label'];
                                                break;
                                        }
                                    }
                                }
                            }
                        } else if (!('displayed_information' in node_properties)) {
                            literal_label = literal_predicate + ': ' + obj_node['label'];
                        }
                    } else {
                        literal_label = literal_predicate + ': ' + obj_node['label'];
                    }
                    original_literal_label = literal_label;
                    if (default_literal_label !== '' && subj_node_to_update['default_label'].indexOf(default_literal_label) === -1) {
                        if (subj_node_to_update['default_label'])
                            default_literal_label = "\n" + default_literal_label;
                        nodes.update({
                            id: subj_id,
                            default_label: subj_node_to_update['default_label'] + default_literal_label
                        });
                    }
                    if (node_properties !== undefined) {
                        let config_value = node_properties['config_file'];
                        let checkbox_config = document.getElementById('config_' + config_value);
                        if (checkbox_config && !checkbox_config.checked)
                            literal_label = default_literal_label;
                    }
                    if (literal_label !== '' && subj_node_to_update['label'].indexOf(literal_label) === -1) {
                        if (subj_node_to_update['label'] && !literal_label.startsWith("\n")) {
                            literal_label = "\n" + literal_label;
                        }
                        if (subj_node_to_update['original_label'] && original_literal_label !== '') {
                            original_literal_label = "\n" + original_literal_label;
                        }
                        nodes.update({
                            id: subj_id,
                            label: subj_node_to_update['label'] + literal_label,
                            original_label: subj_node_to_update['original_label'] + original_literal_label
                        });
                    }
                }
            }
            else
                nodes.add([obj_node]);
        }
    }
}

