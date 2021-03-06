function Right_Content()
{
    this.scatter = {}
}

Right_Content.prototype.init = function()
{
    var self = this;
    self.dom_node = $("#right-content");
    self.scatter = new ColorScatter("#scatter-div");

    self.scatterColorOptions = $(self.dom_node).find("input[name='scatterColorButtons']")

    $(self.scatterColorOptions).on('change', function(){
        self.update({ 'colorScatterOption': '' }) // No need to send value
    })

    //Enable Toggling of Lasso Select
    $(self.dom_node).find("#lasso-select").on("click", function() {
        var tog = $(this).html();
        if (tog == "Enable Lasso Select") {
            self.scatter.toggleLasso(true);
            $(this).html("Disable Lasso Select");
        } else {
            self.scatter.toggleLasso(false);
            $(this).html("Enable Lasso Select");
        }
    });

    $(self.dom_node)
        .find("#export-button")
        .on("click", function () {
            self.exportSigProj()
        });

    self.setLoadingStatus = createLoadingFunction(self.dom_node);

    var proj_promise = api.projections.list()
        .then(function(proj_names) {

            var projSelect = self.dom_node.find('#SelectProjScatter')
            projSelect.children().remove()

            _.each(proj_names, function (proj) {
                projSelect.append(
                    $('<option>', {
                        value: proj,
                        text: proj
                    }));
            });

            projSelect.chosen({
                'width': '110px',
                'disable_search_threshold': 99,
            })
                .off('change')
                .on('change', function () {
                    set_global_status({
                        'plotted_projection':$(this).val(),
                    });
                })
                .trigger('chosen:updated')

        });

    var treeproj_promise = api.tree.list()
        .then(function(proj_names) {

            var projSelect = self.dom_node.find('#SelectTrajectoryProjScatter')
            projSelect.children().remove()

            _.each(proj_names, function (proj) {
                projSelect.append(
                    $('<option>', {
                        value: proj,
                        text: proj
                    }));
            });

            projSelect.chosen({
                'width': '110px',
                'disable_search_threshold': 99,
            })
                .off('change')
                .on('change', function () {
                    set_global_status({
                        'plotted_trajectory':$(this).val(),
                    });
                })
                .trigger('chosen:updated')

        });

    return $.when(proj_promise, treeproj_promise)


}

Right_Content.prototype.update = function(updates)
{
    var self = this;

    if('selected_cell' in updates){
        self.scatter.updateSelection()
    }

    var needsUpdate = ('main_vis' in updates) ||
        ('plotted_item' in updates) ||
        ('plotted_item_type' in updates) ||
        ('plotted_projection' in updates) ||
        ('plotted_trajectory' in updates) ||
        ('plotted_pc' in updates) ||
        ('colorScatterOption' in updates);

    if (!needsUpdate) return $.Deferred().resolve().promise()

    var main_vis = get_global_status('main_vis');

    var autoZoom = false
    if('plotted_projection' in updates ||
       'plotted_trajectory' in updates ||
       'main_vis' in updates) {

        autoZoom = true
    }

    if(main_vis === 'clusters' || main_vis === "pcannotator"){
        self.draw_sigvp(autoZoom);

    } else if (main_vis === "tree") {
        self.draw_tree(autoZoom);

    } else {
        throw "Bad main_vis value!";
    }

    // Update the dropdown if plotted projection changes elsewhere
    if('plotted_projection' in updates) {
        var proj_key = get_global_status('plotted_projection');
        var projSelect = self.dom_node.find('#SelectProjScatter')
        projSelect.val(proj_key)
        projSelect.trigger('chosen:updated') // Changes shown item, but doesn't fire update event
    }

    // Update the dropdown if plotted trajectory changes elsewhere
    if('plotted_trajectory' in updates) {
        var proj_key = get_global_status('plotted_trajectory');
        var projSelect = self.dom_node.find('#SelectTrajectoryProjScatter')
        projSelect.val(proj_key)
        projSelect.trigger('chosen:updated') // Changes shown item, but doesn't fire update event
    }

    if('main_vis' in updates){
        $('#plot-subtitle-latent').hide()
        $('#plot-subtitle-trajectory').hide()
        if(main_vis === 'tree'){
            $('#plot-subtitle-trajectory').show()
        } else {
            $('#plot-subtitle-latent').show()
        }
    }

    // Need to return a promise
    return $.Deferred().resolve().promise()

}

Right_Content.prototype.select_default_proj = function()
{
    var proj = $(this.dom_node.find('#SelectProjScatter')).val()
    var traj = $(this.dom_node.find('#SelectTrajectoryProjScatter')).val()

    var update = {}
    update['plotted_projection'] = proj
    update['plotted_trajectory'] = traj
    return update;
}

Right_Content.prototype.draw_sigvp = function(autoZoom) {

    var self = this;

    var item_key = get_global_status('plotted_item');
    var item_type = get_global_status('plotted_item_type');
    var proj_key = get_global_status('plotted_projection');

    var projection = get_global_data('sig_projection_coordinates')
    var values = get_global_data('plotted_values')

    var sample_value = _.values(values)[0]
    var isFactor = (typeof(sample_value) === 'string') &&
                   (sample_value !== "NA")

    var full_color_range, diverging_colormap
    if(item_type === "gene" || item_type === 'signature-gene'){
        $(self.dom_node).find("#plotted-value-option").hide()
        full_color_range = true
        diverging_colormap = false
    } else if(item_type === "meta"){
        $(self.dom_node).find("#plotted-value-option").hide()
        full_color_range = false
        diverging_colormap = true
    } else {
        $(self.dom_node).find("#plotted-value-option").show()
        full_color_range = false
        diverging_colormap = true
    }

    if(self.getScatterColorOption() == "rank" && item_type === 'signature') {

        values = self.rank_values(values)
    }


    $('#plot-title').text(item_key);

    var points = [];
    var sample_labels = Object.keys(values).sort()
    var selected_cells = get_global_status('selected_cell')
    var selected_cells_map = _.keyBy(selected_cells, x => x)
    if(selected_cells.length == 1){ // Just a single cell
        selected_cells_map = {} // Don't style anything
    }

    _.each(sample_labels, (sample_label) => {
        var x = projection[sample_label][0]
        var y = projection[sample_label][1]
        var sig_score = values[sample_label]
        var selected = sample_label in selected_cells_map

        points.push({
            x: x, y: y,
            value: sig_score, label: sample_label,
            selected: selected,
        });
    })

    self.scatter.setData({
        points: points,
        isFactor: isFactor,
        full_color_range: full_color_range,
        diverging_colormap: diverging_colormap
    });

    if (autoZoom){
        self.scatter.autoZoom();
    }
}


Right_Content.prototype.draw_tree = function(autoZoom) {

    var self = this;

    var item_key = get_global_status('plotted_item');
    var item_type = get_global_status('plotted_item_type');
    var proj_key = get_global_status('plotted_trajectory');

    var milestonePromise = api.tree.milestones(proj_key);

    var projection = get_global_data('tree_projection_coordinates')
    var values = get_global_data('plotted_values')

    var isFactor = (typeof(_.values(values)[0]) === 'string') &&
                   (_.values(values)[0] !== "NA")

    var full_color_range, diverging_colormap
    if(item_type === "gene" || item_type === "signature-gene"){
        $(self.dom_node).find("#plotted-value-option").hide()
        full_color_range = true
        diverging_colormap = false
    } else if(item_type === "meta"){
        $(self.dom_node).find("#plotted-value-option").hide()
        full_color_range = false
        diverging_colormap = true
    } else {
        $(self.dom_node).find("#plotted-value-option").show()
        full_color_range = false
        diverging_colormap = true
    }

    if(self.getScatterColorOption() == "rank"
        && !isFactor && item_type !== "gene"
        && item_type !== "meta") {

        values = self.rank_values(values)
    }

    return $.when(milestonePromise) // Runs when both are completed
        .then(function(milestoneCoordinates){

            var treep = milestoneCoordinates[0]
            var treel = milestoneCoordinates[1]

            // Massage treep for easier D3 binding

            tree_points = []

            $('#plot-title').text(item_key);

            var points = [];
            var sample_labels = Object.keys(values).sort()
            var selected_cells = get_global_status('selected_cell')
            var selected_cells_map = _.keyBy(selected_cells, x => x)
            if(selected_cells.length == 1){ // Just a single cell
                selected_cells_map = {} // Don't style anything
            }

            _.each(sample_labels, (sample_label) => {
                var x = projection[sample_label][0]
                var y = projection[sample_label][1]
                var sig_score = values[sample_label]
                var selected = sample_label in selected_cells_map

                points.push({
                    x: x, y: y,
                    value: sig_score, label: sample_label,
                    selected: selected,
                });
            })

            var tree_points = [];
            for (var i = 0; i < treep.length; i++) {
                var x = treep[i][0];
                var y = treep[i][1];
                tree_points.push([x, y, "Node " + i]);
            }

            // Change tree adjacency list into a list of pairs
            var tree_adj = []

            for (var i = 0; i < treel.length; i++) {
                for (var j = i+1; j < treel[i].length; j++) {
                    if (treel[i][j] == 1) {
                        tree_adj.push([i, j])
                    }
                }
            }

            self.scatter.setData({
                points: points,
                isFactor: isFactor,
                full_color_range: full_color_range,
                diverging_colormap: diverging_colormap,
                tree_points: tree_points,
                tree_adj: tree_adj,
            });

            if (autoZoom){
                self.scatter.autoZoom();
            }

        });
}

Right_Content.prototype.draw_pca = function() {

    var self = this;

    $(self.dom_node).find("#plotted-value-option").hide()

    var item_key = get_global_status('plotted_item');
    var item_type = get_global_status('plotted_item_type');

    var pc_key = get_global_status('plotted_pc');

    var pca = get_global_data('pca_projection_coordinates')
    var values = get_global_data('plotted_values')

    var isFactor;
    if(item_type === "meta"){
        isFactor = (typeof(Object.values(values)[0]) === "string") &&
                   (_.values(values)[0] !== "NA")
    } else {
        isFactor = false;
    }

    $("#plot-title").text(item_key);

    var points = []
    var sample_labels = Object.keys(values).sort()
    var selected_cells = get_global_status('selected_cell')
    var selected_cells_map = _.keyBy(selected_cells, x => x)
    if(selected_cells.length == 1){ // Just a single cell
        selected_cells_map = {} // Don't style anything
    }

    _.each(sample_labels, (sample_label) => {
        var x = pca[sample_label][pc_key-1]
        var y = values[sample_label]
        var sig_score = null
        var selected = sample_label in selected_cells_map

        points.push({
            x: x, y: y,
            value: sig_score, label: '',
            selected: selected,
        });
    })

    self.scatter.setData({
        points: points,
        isFactor: isFactor
    });
}

// Called when the window is resized
Right_Content.prototype.resize = function() {

    this.scatter.resize()
}

Right_Content.prototype.getScatterColorOption = function() {
    return this.scatterColorOptions.filter(":checked").val()
}


//Returns the rank of each value in values (object)
//Averages ranks that are ties
Right_Content.prototype.rank_values = function(values)
{
    var pairs = _.toPairs(values)
    pairs.sort(function(a, b) { return a[1] - b[1];})
    var ranks = {}

    var current_group_start = 0
    var current_group_end;
    var last_val = pairs[0][1]
    var current_val;
    var current_group_rank;
    var i, j;

    for(i = 1; i < pairs.length; i++)
    {
        current_val = pairs[i][1]
        if(current_val !== last_val){
            current_group_end = i-1;
            current_group_rank = (current_group_end + current_group_start)/2
            for(j = current_group_start; j <= current_group_end; j++)
            {
                ranks[pairs[j][0]] =  current_group_rank
            }
            current_group_start = i
        }
        last_val = current_val
    }

    // Need to wrap up the final group
    current_group_end = pairs.length-1;
    current_group_rank = (current_group_end + current_group_start)/2
    for(j = current_group_start; j <= current_group_end; j++)
    {
        ranks[pairs[j][0]] =  current_group_rank
    }

    return ranks
}

/*
Exports a zip with data in it
 */
Right_Content.prototype.exportSigProj = function()
{
    var self = this;
    var zip = new JSZip();

    var main_vis = get_global_status('main_vis')

    var plotted_item = get_global_status('plotted_item')
    var values = get_global_data('plotted_values')

    //Convert the data that's in the scatter plot to a tab-delimited table

    var proj;
    if (main_vis === 'clusters' || main_vis === 'pcannotator') {
        proj = get_global_data('sig_projection_coordinates')
    } else if (main_vis ==='tree') {
        proj = get_global_data('tree_projection_coordinates')
    } else {
        throw "Bad main_vis value!";
    }

    var table;
    if (main_vis === 'tree' || main_vis === 'clusters') {

        table = _.map(proj, (value, key) => {
            return [key, proj[key][0], proj[key][1], values[key]]
        });

        table = [["Cell", "X", "Y", plotted_item]].concat(table);

    }

    table = table.map(function(x){ return x.join("\t");});
    var scatter_csv_str = table.join("\n");
    zip.file("Scatter.txt", scatter_csv_str);

    var zip_uri = "data:application/zip;base64," + zip.generate({type:"base64"});

    var a = document.createElement("a");
    var proj_name;
    if (main_vis === 'tree'){
        proj_name = get_global_status('plotted_trajectory')
    } else {
        proj_name = get_global_status('plotted_projection')
    }

    a.download = plotted_item+"_"+proj_name+".zip";
    a.href = zip_uri;
    a.click();

}

Right_Content.prototype.hover_cells = function(cell_ids)
{
    this.scatter.hover_cells(cell_ids);
}
