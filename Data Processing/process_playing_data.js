fs = require('fs');

var counter = 0;

input_folder = '/' + process.argv[2];
output_folder = 'training_data/';

if (!fs.existsSync(output_folder)){
    fs.mkdirSync(output_folder);
}

fs.readdir(__dirname + input_folder, function(err, items) {

    for (var l=0; l < items.length; l++) {
    	//if (l >= 1) return;
		console.log(items[l] + ' : ' + (l+1) + ' / ' + items.length);
		
		// synchronised due to errors if too many files are open
		var data = fs.readFileSync(__dirname + input_folder + '/' + items[l], 'utf8');
		
		for (var m = 0; m <= 1; m++){
			if (m === 1) data = invert_players(data);

			data_arr = data.split(/\r?\n/);
			var board = init_board();
			var all_boards = [];
			var p1_connectivity_board = init_board();
			var p1_piece_order = Array.apply(null, Array(21)).map(Number.prototype.valueOf,0);
			var all_p1_conns = [];
			var p2_connectivity_board = init_board();
			var p2_piece_order = Array.apply(null, Array(21)).map(Number.prototype.valueOf,0);
			var all_p2_conns = [];
		
			for (var i = 2; i < data_arr.length; i++){
				if (data_arr[i] !== ''){
					var line = data_arr[i].split(' ');
					var id = line[0];
					var block_line = line[1];
				
					var blocks = block_line.split(';');
					var coords = [];
					for (var b = 0; b < blocks.length-1; b++){
						var x = parseInt(blocks[b].split(',')[0]);
						var y = parseInt(blocks[b].split(',')[1]);
					
						if (id == '2:'){
							x = 13 - x;
							y = 13 - y;
						}
						coords.push([y,x]);
					}
				
					board = place_piece(board.slice(), coords, parseInt(id));
					//console.log(board);
					if (id == '1:'){
						var piece_id = get_piece_id(coords);
						p1_connectivity_board = place_piece(p1_connectivity_board.slice(), coords, piece_id);
						all_p1_conns.push(JSON.parse(JSON.stringify(connectivity_matrix(p1_connectivity_board))));
						p1_piece_order[piece_id-1] = all_p1_conns.length;
					}else{
						var piece_id = get_piece_id(coords);
						p2_connectivity_board = place_piece(p2_connectivity_board.slice(), coords, piece_id);
						all_p2_conns.push(JSON.parse(JSON.stringify(connectivity_matrix(p2_connectivity_board))));
						p2_piece_order[piece_id-1] = all_p2_conns.length;
					}
					all_boards.push(JSON.parse(JSON.stringify(board)));
				}
			}
			/*
			for (var y = 0; y < board.length; y++){
				for (var x = 0; x < board[y].length; x++){
					if (board[y][x] === 2) board[y][x] = 0;
				}
			}*/
		
			var winner = -1;
			var final_score = get_scores(board);
			var final_p1_score = final_score[0];
			var final_p2_score = final_score[1];
			//console.log(board);
			//console.log(final_score);
			if (final_p1_score > final_p2_score){
				winner = 1;
			}else if (final_p2_score > final_p1_score){
				winner = 2;
			}else{
				winner = 0;
			}
		
			//
			// Could switch p2 values around to double training data.
			// Only necessary if working with valuable human playing data.
			//
		
			var output = {};
			//console.log('all_boards.length = ' + all_boards.length + ', all_p1_conns.length = ' + all_p1_conns.length + ', all_p2_conns.length = ' + all_p2_conns.length);
			for (var k = 0; k < all_boards.length; k++){
				if ((winner == 1 && k % 2 == 0) || (winner == 2 && k % 2 == 1)){
					output.player = k % 2 === 0 ? 1 : 2;
					output.moved_first = ((output.player === 1 && m === 0) || (output.player === 2 && m === 1));
					output.board = output.player == 1 ? all_boards[k] : inverse_board(all_boards[k]);
					output.num_moves = [Math.floor(k/2)+1,Math.ceil(k/2)];
					output.score = get_scores(output.board);
					output.final_score = final_score;
					output.won = true;
					output.connectivity_matrix = (output.player === 1 ? all_p1_conns.shift() : all_p2_conns.shift());
					output.piece_order = (output.player === 1 ? zero_elements_above_n(p1_piece_order,output.num_moves[0]+1) : zero_elements_above_n(p2_piece_order,output.num_moves[1]+1));
					write_data(output);
				}else if ((winner == 2 && k % 2 == 0) || (winner == 1 && k % 2 == 1)){
					output.player = k % 2 === 0 ? 1 : 2;
					output.moved_first = ((output.player === 1 && m === 0) || (output.player === 2 && m === 1));
					output.board = output.player == 1 ? all_boards[k] : inverse_board(all_boards[k]);
					output.num_moves = [Math.floor(k/2)+1,Math.ceil(k/2)];
					output.score = get_scores(output.board);
					output.final_score = final_score;
					output.won = false;
					output.connectivity_matrix = (output.player === 1 ? all_p1_conns.shift() : all_p2_conns.shift());
					output.piece_order = (output.player === 1 ? zero_elements_above_n(p1_piece_order,output.num_moves[0]+1) : zero_elements_above_n(p2_piece_order,output.num_moves[1]+1));
					write_data(output);
				}
				//disregards draws
			}
		}
	}
});

function invert_players(item){
	var new_item = JSON.parse(JSON.stringify(item));
	new_item = new_item.replace(/1:/g, '3:');
	new_item = new_item.replace(/2:/g, '1:');
	new_item = new_item.replace(/3:/g, '2:');
	return new_item;
}

function get_scores(board){
	var p1_score = 0;
	var p2_score = 0;
	for (var y = 0; y < board.length; y++){
		for (var x = 0; x < board[y].length; x++){
			if (board[y][x] == 1) p1_score++;
			if (board[y][x] == 2) p2_score++;
		}
	}
	return [p1_score, p2_score];
}

function zero_elements_above_n(arr,n){
	var result = Array.apply(null, Array(arr.length)).map(Number.prototype.valueOf,0);
	for (var i = 0; i < arr.length; i++){
		if (arr[i] < n) result[i] = arr[i];
	}
	return result;
}

function place_piece(board, piece, id){
	for (var i = 0; i < piece.length; i++){
		board[13-piece[i][0]][13-piece[i][1]] = id;
	}
	return board;
}

function init_board(){
	var arr = [];
	for (var y = 0; y < 14; y++){
		var line = [];
		for (var x = 0; x < 14; x++){
			line.push(0);
		}
		arr.push(line);
	}
	return arr;
}

function inverse_board(board){
	var inverse = [];
	for (var y = board.length-1; y >= 0; y--){
		inverse.push(board[y].reverse());
	}
	for (var y = 0; y < inverse.length; y++){
		for (var x = 0; x < inverse[y].length; x++){
			if (inverse[y][x] == 1){
				inverse[y][x] = 2;
			}else if (inverse[y][x] == 2){
				inverse[y][x] = 1;
			}
		}
	}
	return inverse;
}

function connectivity_matrix(conn_board){
	var result = mat_zeroes(21,21);
	for (var y = 0; y < 14; y++){
		for (var x = 0; x < 14; x++){
			if (conn_board[y][x] !== 0){
				if (y > 0 && x > 0){
					if (conn_board[y-1][x-1] !== 0 && conn_board[y-1][x-1] !== conn_board[y][x]){
						result[conn_board[y-1][x-1]-1][conn_board[y][x]-1] = 1;
						result[conn_board[y][x]-1][conn_board[y-1][x-1]-1] = 1;
					}
				}
				if (y < 13 && x > 0){
					if (conn_board[y+1][x-1] !== 0 && conn_board[y+1][x-1] !== conn_board[y][x]){
						result[conn_board[y+1][x-1]-1][conn_board[y][x]-1] = 1;
						result[conn_board[y][x]-1][conn_board[y+1][x-1]-1] = 1;
					}
				}
				if (y > 0 && x < 13){
					if (conn_board[y-1][x+1] !== 0 && conn_board[y-1][x+1] !== conn_board[y][x]){
						result[conn_board[y-1][x+1]-1][conn_board[y][x]-1] = 1;
						result[conn_board[y][x]-1][conn_board[y-1][x+1]-1] = 1;
					}
				}
				if (y < 13 && x < 13){
					if (conn_board[y+1][x+1] !== 0 && conn_board[y+1][x+1] !== conn_board[y][x]){
						result[conn_board[y+1][x+1]-1][conn_board[y][x]-1] = 1;
						result[conn_board[y][x]-1][conn_board[y+1][x+1]-1] = 1;
					}
				}
			}
		}
	}
	return result;
}

function normalise_coords(coords){
	var min_x = 0xFFFF;
	var min_y = 0xFFFF;
	for (var i = 0; i < coords.length; i++){
		if (coords[i][0] < min_x) min_x = coords[i][0];
		if (coords[i][1] < min_y) min_y = coords[i][1];
	}
	var result = [];
	for (var i = 0; i < coords.length; i++){
		result.push([coords[i][0]-min_x,coords[i][1]-min_y]);
	}
	return result;
}

function get_piece_id(coords){
	coords = normalise_coords(coords);
	var mat = get_matrix(coords);
	var compare;
	for (var i = 1; i <= 21; i++){
		compare = nth_piece(i);
		
		if (getPieceSize(mat) !== getPieceSize(compare)) continue;
		
		if (mat.length === compare.length && mat[0].length === compare[0].length){
			if (compare_mats(mat,compare)) return i;
			if (compare_mats(mat,rotateCCW(rotateCCW(compare)))) return i;
			if (compare_mats(mat,flipVer(compare))) return i;
			if (compare_mats(mat,flipVer(rotateCCW(rotateCCW(compare))))) return i;
		}
		if (mat[0].length === compare.length && mat.length === compare[0].length){
			if (compare_mats(mat,rotateCCW(compare))) return i;
			if (compare_mats(mat,rotateCCW(rotateCCW(rotateCCW(compare))))) return i;
			if (compare_mats(mat,flipVer(rotateCCW(compare)))) return i;
			if (compare_mats(mat,flipVer(rotateCCW(rotateCCW(rotateCCW(compare)))))) return i;
		}
	}
	return -1;
}

function print(mat){
	var line;
	for (var y = 0; y < mat.length; y++){
		line = '';
		for (var x = 0; x < mat[0].length; x++){
			line += (mat[y][x] === 1 ? 'x' : ' ');
		}
		console.log(line);
	}
}

function compare_mats(m, n){
	for (var y = 0; y < m.length; y++){
		for (var x = 0; x < m[0].length; x++){
			if (m[y][x] !== n[y][x]) return false;
		}
	}
	return true;
}

function get_matrix(coords){
	var max_x = 0;
	var max_y = 0;
	for (var i = 0; i < coords.length; i++){
		if (coords[i][0] > max_x) max_x = coords[i][0];
		if (coords[i][1] > max_y) max_y = coords[i][1];
	}
	var mat = mat_zeroes(max_x+1,max_y+1);
	
	for (var i = 0; i < coords.length; i++){
		mat[coords[i][1]][coords[i][0]] = 1;
	}
	return flipVer(mat);
}

function rotateCCW(piece){ //[[1,1,1],[1,1,0]] -> [[1,1],[1,1],[1,0]]
	var result = [];
	
	for (var x = 0; x < piece[0].length; x++){ //3
		result.push([]);
		for (var y = 0; y < piece.length; y++){ //2
			result[x].push(piece[y][x]);
		}
	}
	return flipVer(result);
}


function flipVer(piece){ //[[1,1,1],[1,1,0]] -> [[1,1,0],[1,1,1]]
	var result = [];
	
	for (var y = piece.length-1; y >= 0; y--){ //2
		result.push(piece[y]);
	}
	return result;
}

function getPieceSize(piece){
	var count = 0;
	for (var y = 0; y < piece.length; y++){
		for (var x = 0; x < piece[y].length; x++){
			if (piece[y][x] === 1) count++;
		}
	}
	return count;
}

function does_pair_match(a,b){
	return (a[0] == b[0] && a[1] == b[1]);
}

function mat_zeroes(x,y){
	var result = [];
	for (var i = 0; i < y; i++){
		result.push([]);
		for (var j = 0; j < x; j++){
			result[i].push(0);
		}
	}
	return result;
}

function write_data(output){
	var name = ''
	do{
		//name = make_ID(16);
		name = 'training_' + counter;
		counter++;
	}while(fs.existsSync(output_folder + name));
	fs.writeFileSync(output_folder + name, JSON.stringify(output));
}

function make_ID(len){
    var text = '';
    var possible = 'abcdefghijklmnopqrstuvwxyz0123456789';

    for (var i = 0; i < len; i++){
        text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
    return text;
}

function nth_piece(n){
	var pieces = [];
	var p1 = JSON.parse("{\"width\":1,\"height\":1,\"data\":[[1]]}");
	pieces.push(p1);
	var p2 = JSON.parse("{\"width\":2,\"height\":1,\"data\":[[1,1]]}");
	pieces.push(p2);
	var p3 = JSON.parse("{\"width\":3,\"height\":1,\"data\":[[1,1,1]]}");
	pieces.push(p3);
	var p4 = JSON.parse("{\"width\":2,\"height\":2,\"data\":[[1,1],[1,0]]}");
	pieces.push(p4);
	var p5 = JSON.parse("{\"width\":4,\"height\":1,\"data\":[[1,1,1,1]]}");
	pieces.push(p5);
	var p6 = JSON.parse("{\"width\":3,\"height\":2,\"data\":[[1,1,1],[1,0,0]]}");
	pieces.push(p6);
	var p7 = JSON.parse("{\"width\":3,\"height\":2,\"data\":[[0,1,1],[1,1,0]]}");
	pieces.push(p7);
	var p8 = JSON.parse("{\"width\":3,\"height\":2,\"data\":[[1,1,1],[0,1,0]]}");
	pieces.push(p8);
	var p9 = JSON.parse("{\"width\":2,\"height\":2,\"data\":[[1,1],[1,1]]}");
	pieces.push(p9);
	var p10 = JSON.parse("{\"width\":5,\"height\":1,\"data\":[[1,1,1,1,1]]}");
	pieces.push(p10);
	var p11 = JSON.parse("{\"width\":4,\"height\":2,\"data\":[[1,1,1,1],[1,0,0,0]]}");
	pieces.push(p11);
	var p12 = JSON.parse("{\"width\":4,\"height\":2,\"data\":[[1,1,1,1],[0,1,0,0]]}");
	pieces.push(p12);
	var p13 = JSON.parse("{\"width\":4,\"height\":2,\"data\":[[0,1,1,1],[1,1,0,0]]}");
	pieces.push(p13);
	var p14 = JSON.parse("{\"width\":3,\"height\":2,\"data\":[[1,1,1],[1,1,0]]}");
	pieces.push(p14);
	var p15 = JSON.parse("{\"width\":3,\"height\":2,\"data\":[[1,1,1],[1,0,1]]}");
	pieces.push(p15);
	var p16 = JSON.parse("{\"width\":3,\"height\":3,\"data\":[[1,1,1],[0,1,0],[0,1,0]]}");
	pieces.push(p16);
	var p17 = JSON.parse("{\"width\":3,\"height\":3,\"data\":[[0,0,1],[0,0,1],[1,1,1]]}");
	pieces.push(p17);
	var p18 = JSON.parse("{\"width\":3,\"height\":3,\"data\":[[0,1,1],[1,1,0],[1,0,0]]}");
	pieces.push(p18);
	var p19 = JSON.parse("{\"width\":3,\"height\":3,\"data\":[[0,1,1],[0,1,0],[1,1,0]]}");
	pieces.push(p19);
	var p20 = JSON.parse("{\"width\":3,\"height\":3,\"data\":[[0,1,1],[1,1,0],[0,1,0]]}");
	pieces.push(p20);
	var p21 = JSON.parse("{\"width\":3,\"height\":3,\"data\":[[0,1,0],[1,1,1],[0,1,0]]}");
	pieces.push(p21);

	return pieces[n-1].data;
}
