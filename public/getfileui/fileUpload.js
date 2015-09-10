$(function() {

/* CSV PARSER http://rohitrox.github.io/js_csv/ */
  function fileInfo(e){
    var file = e.target.files[0];
    if (file.name.split(".")[1].toUpperCase() != "CSV"){
      alert('Invalid csv file !');
      e.target.parentNode.reset();
      return;
    }else{
      document.getElementById('file_info').innerHTML = "<p>File Name: "+file.name + " | "+file.size+" Bytes.</p>";
    }
  }
 function handleFileSelect(){
  var file = document.getElementById("the_file").files[0];
  var reader = new FileReader();
  var link_reg = /(http:\/\/|https:\/\/)/i;
  reader.onload = function(file) {
              var content = file.target.result;
              var rows = file.target.result.split(/[\r\n|\n]+/);
              var table = document.createElement('table');
              
              for (var i = 0; i < rows.length; i++){
                var tr = document.createElement('tr');
                var arr = rows[i].split(',');

                for (var j = 0; j < arr.length; j++){
                  if (i==0)
                    var td = document.createElement('th');
                  else
                    var td = document.createElement('td');

                  if( link_reg.test(arr[j]) ){
                    var a = document.createElement('a');
                    a.href = arr[j];
                    a.target = "_blank";
                    a.innerHTML = arr[j];
                    td.appendChild(a);
                  }else{
                    td.innerHTML = arr[j];
                  }
                  tr.appendChild(td);
                }

                table.appendChild(tr);
              }

              document.getElementById('list').appendChild(table);
          };
  reader.readAsText(file);
 }
 document.getElementById('the_form').addEventListener('submit', handleFileSelect, false);
 document.getElementById('the_file').addEventListener('change', fileInfo, false);
});

