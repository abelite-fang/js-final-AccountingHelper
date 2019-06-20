const express = require('express');
const app = express();

var mysql = require('mysql');
var fs = require("fs");
var session = require('express-session');
var bodyParser = require('body-parser');
var path = require('path');

var mysqlconn = mysql.createConnection({
	host     : 'localhost',
	user     : 'js',
	password : 'jsfinal',
	database : 'jsfinal'
});

app.use('/js', express.static('js'))
app.use('/css', express.static('css'))
app.use(session({
	secret: 'secret',
	resave: true,
	saveUninitialized: true
}));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());


// + login page (index)
app.get('/', function(request, response) {
	console.log('GET /');
	response.sendFile(path.join(__dirname + '/login.html'));
});

// + register page
app.get('/reg', function(request, response){
	console.log('GET /reg');
	response.sendFile(path.join(__dirname + '/register.html'));
});

// - post create new user
app.post('/newuser', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	console.log('POST /newuser');
	console.log(request.body);
	if (username && password) {
		mysqlconn.query('INSERT INTO users (username, password) VALUES (?,?)',
		 [username, password], function(error, results, fields) {
			//if (error) throw error;
			console.log(results);
			//console.log(results.length);	
			if (results != undefined){
				response.redirect('/');
				// register succ
			}else{
				response.send('Add User Error, Please contact admin');
				// 500?
			}
			response.end();
		 });
	} else {
		response.send('Please enter Username');
		response.end();
	}
});

// ? ajax check existense
app.get('/usercheck/:username', function(request, response) {
	var username = request.params.username;
	mysqlconn.query('SELECT * FROM users WHERE username = ?', [username], function(error, results, fields){
		console.log(results);
		if(results.length != 0){
			response.send( username + ' has been registered');
		}else{
			response.send( 'You can use this username');
		}
	});
});


// + user login auth
app.post('/login', function(request, response) {
	var username = request.body.username;
	var password = request.body.password;
	console.log(request.body);
	//console.log(passowrd);
	if (username && password) {
		mysqlconn.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password], function(error, results, fields) {
			console.log(results);
			//console.log(results[0].uid);
			var uid = results[0].uid;
			if (results.length > 0) {
				var promise1 = new Promise((resolve)=>{
					console.log('pr1');
					if (results[0].type == 1){ request.session.admin = true; resolve('1');}
					else{	request.session.admin = false; resolve('2');}

				})
				var promise2 = new Promise((resolve)=>{
					console.log('pr2');
					request.session.loggedin = true;
					request.session.username = username;
					request.session.uid = uid;
					resolve('ok');
				})
				Promise.all([promise1, promise2]).then((values)=>{
					console.log('pra1');
					console.log(values);
					response.redirect('/user');
					console.log('pra2');
				}).catch((error)=>{
					console.log("login error");
					console.log('prae');
				})
				console.log('ff');
			} else {	
				console.log('else1');
				response.send('Incorrect Username and/or Password!');
			}			
		});
	} else {
		console.log('else2');
		response.send('Please enter Username and Password!');
		response.end();
	}
});

// + user logout
app.post('/logout', function(request, response) {
	console.log('POST /logout');
	request.session.loggedin = false;
	request.session.uid = 0;
	request.session.username = null;
	request.session.admin = false;
	response.redirect('/');
});


app.get('/admin', function(request, response){
	if( request.session.loggedin && request.session.admin){
		renderAdminList(request, response);
		//response.status(200).send("OK");
	}else{
		response.status(404)        // HTTP status 404: NotFound
   	.send('Not found');
	}
});

app.post('/admin/delete', function(request,response){
	if(request.session.loggedin && request.session.admin){
		mysqlconn.query('delete from users where uid = ?', [request.body.uid],
			function(error, results, fields){
		if (error) throw error;
		response.redirect('/admin');
		});
	}
});
app.post('/admin/modify', function(request,response){
	if(request.session.loggedin && request.session.admin){
		console.log('/admin/modify');
		console.log(request.body);
		mysqlconn.query('update users set password=?, type=? where uid = ?', [request.body.password, request.body.type, request.body.uid],
			function(error, results, fields){
		if (error) throw error;
		response.redirect('/admin');
		});
	}
});
// + user logged in page
app.get('/user', function(request, response) {
	var userhtml = fs.readFileSync(path.join(__dirname + '/user.html'), 'utf8');
	console.log('GET /user');
	if (request.session.loggedin) {
		//response.sendFile(path.join(__dirname + '/user.html'));
		renderUserList(request, response);
	} else {
		response.send('Please login to view this page! <a href="/">home</a>');
		response.end();
	}
});

app.get('/user/pie', function(request, response){
	if (request.session.loggedin){
		renderUserChart(request, response);
	} else {
		response.send('Please login to view this page! <a href="/">home</a>');
		response.end();
	}
});

app.post('/pieSearch', function(request, response){
	console.log('POST /pieSearch');
	console.log(request.body);
	mysqlconn.query("select r_category, sum(r_cost) as totalcost from record, relation where record.rid=relation.rid and relation.uid=? and r_date >= ? and r_date <= ? group by r_category",
		[request.session.uid, request.body.datefrom, request.body.dateto], function(error, results, fields){
		if (error) throw error;
		var labels = [];
		var datas = [];
		for (var i = 0; i < results.length; i++){
			labels.push(results[i].r_category);
			datas.push(results[i].totalcost);
		}  
		response.json({
			"labels" : labels,
			"datas" : datas
		});
		response.end();
	});
});



// ? user add record
app.post('/addrec', function(request, response){
	console.log('POST /addrec');
	console.log(request.body);
	var r_title = request.body.r_title;
	var r_cost = request.body.r_cost;
	var r_date = request.body.r_dateYY + '-' + request.body.r_dateMM + '-'+ request.body.r_dateDD;
	var r_comment = request.body.r_comment;
	var r_category = request.body.r_category;
	var rid = 0;
	if(r_title != null){
		mysqlconn.query(
			'INSERT INTO record ( r_title, r_cost, r_date, r_comment, r_category ) VALUES ( ?, ?, ?, ?, ?)'
			,[r_title, r_cost, r_date, r_comment, r_category ], function(error, results, fields) {
			if (error) throw error;
			mysqlconn.query(
				'SELECT * FROM record ORDER BY rid DESC LIMIT 1;',[],function(error, results, fields) {
					if(error) throw error;
					rid = results[0].rid;
					console.log('a'+results);
					mysqlconn.query(
						'INSERT INTO relation ( rid, uid ) VALUES (?,?);',[rid, request.session.uid],function(error, results, fields) {
							if(error) throw error;
						});
				});
			console.log('b' + rid);
			
			console.log(results);
			//console.log(results.length);	
			if (results != undefined){
				response.redirect('/user');
				// register succ
			}else{
				response.send('Add User Error, Please contact admin <a href="/user">user page</a>');
				// 500?
			}
			response.end();
		});
	}
});

app.listen(80); 

const userAddButton = '<button class="btn btn-success my-2 my-sm-0" data-toggle="modal" data-target="#addrecModal">新增(Add)</button>';
const userhtml  = fs.readFileSync(path.join(__dirname + '/user.html'), 'utf8');	
const adminhtml = fs.readFileSync(path.join(__dirname + '/admin.html'), 'utf8'); 
function renderUserList( request, response ){
	var returnhtml = userhtml;
	if(request.session.admin){
		returnhtml = returnhtml.replace("{{username}}", "管理員: " + request.session.username);
		returnhtml = returnhtml.replace("{{pageAdmin}}", '<li class="nav-item"><a class="nav-link" href="/admin"> 帳號管理 </a></li>');
	}else{
		returnhtml = returnhtml.replace("{{username}}", request.session.username);
		returnhtml = returnhtml.replace("{{pageAdmin}}", '');
	}
	returnhtml = returnhtml.replace("{{pageUser}}", "active");
	returnhtml = returnhtml.replace("{{addbtn}}", userAddButton);
	returnhtml = returnhtml.replace("{{1}}", "active");
	var tabletmp = '';
	mysqlconn.query(
		'select r_title, r_cost, DATE_FORMAT(r_date,\'%Y-%m-%d\') as r_date, r_comment, r_category from record, relation where relation.rid = record.rid AND relation.uid=? order by r_date desc;',
		[request.session.uid], function(error, results, fields){
			if(error) throw error;
			tabletmp += '<table class="table table-striped">'
								+ '<thead>' + '<tr>'
              + '<th scope="col">title</th>'
              + '<th scope="col">cost</th>'
              + '<th scope="col">date</th>'
              + '<th scope="col">category</th>'
              + '<th scope="col">comment</th>'
              +'</tr>' + '</thead>' + '<tbody>';
			for( i=0; i<results.length; i++){
				console.log(results[i]);
				tabletmp += '<tr>' + 
				'<th>'+ results[i].r_title + '</th>' +
				'<td>'+ results[i].r_cost + '</td>' +
				'<td>'+ results[i].r_date + '</td>' +
				'<td>'+ results[i].r_category + '</td>' +
				'<td>'+ results[i].r_comment + '</td>' +
				'</tr>';
			}
			tabletmp += '</tbody>';
			returnhtml = returnhtml.replace("{{content}}",tabletmp);
			returnhtml = returnhtml.replace("{{canvas}}","");
			response.end(returnhtml);
		}
	);
}


const selectDay = 
'<option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option>'+
'<option value="8">8</option><option value="9">9</option><option value="10">10</option><option value="11">11</option><option value="12">12</option><option value="13">13</option><option value="14">14</option>'+
'<option value="15">15</option><option value="16">16</option><option value="17">17</option><option value="18">18</option><option value="19">19</option><option value="20">20</option>'+
'<option value="21">21</option><option value="22">22</option><option value="23">23</option><option value="24">24</option><option value="25">25</option><option value="26">26</option>'+
'<option value="27">27</option><option value="28">28</option><option value="29">29</option><option value="30">30</option><option value="31">31</option>';
const selectMonth = '<option value="1">Jan</option><option value="2">Feb</option><option value="3">Mar</option><option value="4">Apr</option><option value="5">May</option><option value="6">Jun</option><option value="7">Jul</option><option value="8">Aug</option><option value="9">Sep</option><option value="10">Oct</option><option value="11">Nov</option><option value="12">Dec</option>';
const selectYear = '<option value="2017">2017</option><option value="2018">2018</option><option value="2019">2019</option><option value="2020">2020</option>'
const cselectCategory = '<option value="all">All</option>';
const backgroundColor = '[\'rgba(255, 99, 132, 0.8)\',\'rgba(54, 162, 235, 0.8)\',\'rgba(255, 206, 86, 0.8)\',\'rgba(75, 192, 192, 0.8)\',\'rgba(153, 102, 255, 0.8)\',\'rgba(255, 159, 64, 0.8)\']';
//const backgroundColor = '[\'red\', \'orange\', \'yellow\', \'green\',\'cyan\' ,\'blue\',\'indigo\', \'purple\']';



function renderUserChart( request, response) {
	mysqlconn.query('select distinct(r_category) from record, relation where record.rid=relation.rid and relation.uid=? order by r_category desc',
		[request.session.uid], function(error, results, fields){
		
		if(error) throw error;
		var selectCategory = cselectCategory;
		var labels = '[';
		var datas = '[';
		var chartData = '{datasets: [{ data: ';
		for( i = 0; i < results.length; i++) {
			selectCategory += '<option value="' + results[i].r_category + '">'+ results[i].r_category+'</option>';
		}	
		var returnhtml = userhtml;
		if(request.session.admin){
			returnhtml = returnhtml.replace("{{username}}", "管理員: " + request.session.username);	
			returnhtml = returnhtml.replace("{{pageAdmin}}", '<li class="nav-item"><a class="nav-link" href="/admin"> 帳號管理 </a></li>');
		}else{
			returnhtml = returnhtml.replace("{{username}}", request.session.username);
			returnhtml = returnhtml.replace("{{pageAdmin}}", '');
		}
		returnhtml = returnhtml.replace("{{2}}", "active");
		returnhtml = returnhtml.replace("{{addbtn}}", "");
		var canvasRangeSelection = '<div id="chartSelections">' + 
			'<form class="form-inline" id="chartFromForm">' +
			' <label class="my-1 mr-2" for="inlineFormCustomSelectPref">Select Date From</label>'+
			' <select class="custom-select my-1 mr-sm-2" id="chartFromYear">'+ selectYear + ' </select>' +
			' <select class="custom-select my-1 mr-sm-2" id="chartFromMonth">'+ selectMonth + ' </select>' +
			' <select class="custom-select my-1 mr-sm-2" id="chartFromDay">'+ selectDay + ' </select>' +
			' <label class="my-1 mr-2" for="inlineFormCustomSelectPref">To</label>'+
			' <select class="custom-select my-1 mr-sm-2" id="chartToYear">'+ selectYear + ' </select>' +
			' <select class="custom-select my-1 mr-sm-2" id="chartToMonth">'+ selectMonth + ' </select>' +
			' <select class="custom-select my-1 mr-sm-2" id="chartToDay">'+ selectDay + ' </select>' +
	//		'<select class="custom-select my-1 mr-sm-2" id="chartCategory">' + selectCategory + '</select>'+
			'<button type="button" class="btn btn-primary" id="pieSearch">Search</button></form></div>' ;
		var canvasChart = '<canvas id="myChart" class="pieChart"></canvas>';

		mysqlconn.query("select r_category, sum(r_cost) as totalcost from record, relation where record.rid=relation.rid and relation.uid=? group by r_category",
			[request.session.uid], function(error, results, fields){
			for(i=0; i< results.length; i++){
				labels += '\'' + results[i].r_category + '\'';
				datas += results[i].totalcost;
				if (i == results.length - 1){
					labels += ']';
					datas += ']';
				}else{
					labels += ',';
					datas += ',';
				}
			}						
			chartData += datas + ',label: \'Total Spending\', backgroundColor:' + backgroundColor +  '}], labels:' + labels + '}';
			var canvasJS = '<script>var ctx = document.getElementById(\'myChart\').getContext(\'2d\');  var myPieChart = new Chart(ctx, {type: \'pie\', data:' + chartData + '}); </script>'; 

			returnhtml = returnhtml.replace("{{canvas}}", canvasChart + canvasJS);
			returnhtml = returnhtml.replace("{{content}}", canvasRangeSelection);
			response.end(returnhtml);
		});
	});
}




const adminModifyButton = '<button class="btn btn-warning my-2 my-sm-0" data-toggle="modal" data-target="#addrecModal">新增(Add)</button>';
function renderAdminList( request, response ){
	var returnhtml = adminhtml;
	if(request.session.admin && request.session.username){
		returnhtml = returnhtml.replace("{{username}}", "管理員: " + request.session.username);
		returnhtml = returnhtml.replace("{{pageAdmin}}", '<li class="nav-item"><a class="nav-link active" href="/admin"> 帳號管理 </a></li>');
		returnhtml = returnhtml.replace("{{pageUser}}", "");
		returnhtml = returnhtml.replace("{{addbtn}}", "");
		var tabletmp = '';
		var inlineAdminCheck = '';
		mysqlconn.query(
			'select * from users',
			[], function(error, results, fields){
				if(error) throw error;
				tabletmp += '<table class="table table-striped">'
								+ '<thead class="thead-dark">' + '<tr>'
								+ '<th scope="col">Username</th>'
								+ '<th scope="col">Password</th>'
								+ '<th scope="col">isAdmin</th>'
								+ '<th scope="col">Action</th>'
								+ '<th scope="col">Action</th>'
								+'</tr>' + '</thead>' + '<tbody>';
				for( i=0; i<results.length; i++){
					console.log(results[i]);
					if( results[i].type == 1){
						inlineAdminCheck = '<option selected value="1">Admin</option><option value="0">Regular User</option>';
					}else {	inlineAdminCheck = '<option value="1">Admin</option><option selected value="0">Regular User</option>';}
					tabletmp += '<tr><form method="POST" action="/admin/delete1">' + 
					'<th>'+ results[i].username + '</th>' +
					'<td>'+ '<input type="password" class="form-control" name="password" placeholder="password" value="'+results[i].password+'">' + '</td>' +
					'<td>'+ '<div class="form-group col-md-4"><select name="type" class="form-control"> ' + inlineAdminCheck + '</select></div>' + '</td>' +
					'<td>'+ '<button class="btn btn-success my-2 my-sm-0" type="submit" onclick="return confirm(\'Modify?\');" formaction="/admin/modify"> Modify </button>'  + '</td>' +
					'<td>'+ '<button class="btn btn-danger my-2 my-sm-0" type="submit" onclick="return confirm(\'Delete?\');" formaction="/admin/delete"> Delete User </button>'  + '</td>' +
					'<input type="hidden" name="uid" value="'+ results[i].uid +'">' +
					'</form></tr>';
				}
				tabletmp += '</tbody>';
				returnhtml = returnhtml.replace("{{content}}",tabletmp);
				response.end(returnhtml);
			}
		);
	}
}
