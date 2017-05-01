fs = require('fs');

//console.log(process.argv[2]);
fs.readFile(__dirname + '/' + process.argv[2], 'utf8', function (err,data) {
	if (err) {
		return console.log(err);
	}
	data_arr = data.split(/\r?\n/);
	var board = init_board();
	var all_boards = [];

	console.log(board);
	for (var i = 2; i < data_arr.length; i++){
		if (data_arr[i] !== ''){
			var id = (i % 2 == 0 ? data_arr[0].split(' ')[0] : data_arr[1].split(' ')[0]);
			var block_line = data_arr[i].split(' ')[1];
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
			all_boards.push(JSON.parse(JSON.stringify(board)));
			
			console.log('board after player ' + id[0] + "'s go :");
			console.log(board);
		}
	}
});

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
