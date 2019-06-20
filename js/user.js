function getDate() {
	setTimeout(function(){
		var d = new Date();
		var y = new Date();
		y.setDate(y.getDate() - 1);
			document.getElementById("r_dateDD").value = d.getDate();
      document.getElementById("r_dateMM").value = d.getMonth()+1;
      document.getElementById("r_dateYY").value = d.getFullYear();
			if (document.getElementById("chartSelections")) {
				document.getElementById("chartFromDay").value = y.getDate();
     		document.getElementById("chartFromMonth").value = y.getMonth()+1;
      	document.getElementById("chartFromYear").value = y.getFullYear();

				document.getElementById("chartToDay").value = d.getDate();
     		document.getElementById("chartToMonth").value = d.getMonth()+1;
      	document.getElementById("chartToYear").value = d.getFullYear();

				console.log("Apply today on chartSelections");
			}
      console.log('B');
   },500);
}


function removeData(chart) {
    chart.data.labels.pop();
    chart.data.datasets.forEach((dataset) => {
        dataset.data.pop();
    });
    chart.update();
}




// ajax
$(document).ready(function(){
$("#pieSearch").click(function(){
	$.ajax({
		type:"POST",
		url :"/pieSearch",
		data: {
			datefrom: $("#chartFromYear").val() +'-'+ $("#chartFromMonth").val() +'-'+ $("#chartFromDay").val(),
			dateto: $("#chartToYear").val() +'-'+ $("#chartToMonth").val() +'-'+ $("#chartToDay").val()
		},
		dataType: "text",
		success: function(data){
			var parsed = JSON.parse(data);
			console.log(data);
			console.log(parsed);
			for( i = 0; i < parsed['labels'].length; i++ ){
				console.log(parsed['labels'][i]);
				console.log(parsed['datas'][i]);
							
			}
			myPieChart.destroy();
			myPieChart = new Chart(ctx, {
				type: 'pie', 
				data:{
					datasets: [{ 
						data: parsed['datas'],
						label: 'Total Spending', 
						backgroundColor:['rgba(255, 99, 132, 0.8)','rgba(54, 162, 235, 0.8)','rgba(255, 206, 86, 0.8)','rgba(75, 192, 192, 0.8)','rgba(153, 102, 255, 0.8)','rgba(255, 159, 64, 0.8)']}],
					labels: parsed['labels']
				}
			});
		}
});
});
})

