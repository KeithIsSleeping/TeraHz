function getSong(){
    var songId=$("#songId").val();
    
    $.get('/getSongAnalysis?songId='+songId,function(response) {
        //console.log(response);
        const songInfo = JSON.parse(response)
        $("#songAnalysis").html('Tempo: '+songInfo.track.tempo+'<br>');
        console.log(response);
    });

    $.get('/getSong?songId='+songId,function(response) {
        //console.log(response);
        const songInfo = JSON.parse(response);
        $("#songInfo").html('Name: '+songInfo.name+'<br>');
        console.log(response);
    });
}
$(document).ready(function() {


});