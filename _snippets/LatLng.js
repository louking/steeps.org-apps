// note requires jQuery
// will not work on IE
class LatLng {
  constructor(filecontents, type, getmeters) {
    if (!['gpx', 'kml'].includes(type)) throw 'invalid type: ' + type;
    this.type = type;
    this.filecontents = filecontents;
    this.getmeters = getmeters;
    var xml = $.parseXML(this.filecontents);
    this._$xml = $( xml );
    this._points = this._parse();
  }

  get points() {
    return this._points;  
  };
  
  _parse() {
    if (this.type == 'kml') {
      return this._parsekml();
    } else if (this.type == 'gpx') {
      return this._parsegpx();
    }
  }
  
  _parsekml() {
    var linestring = this._$xml.find('LineString');
    var coordinates = linestring.find('coordinates');
    var coords = coordinates.text().trim().split(' ');
    var points = [];
    for (var i=0; i<coords.length; i++) {
      var latlng = coords[i].split(',');
      var point = [+latlng[1], +latlng[0]];
      if (this.getmeters) point.push(+latlng[2]);
      points.push(point);
    }
    return points;
  };
  
  _parsegpx() {
    var xmlpts = this._$xml.find('trkpt');
    var points = [];
    for (var i=0; i<xmlpts.length; i++) {
      var xmlpt = xmlpts[i];
      var point = [
        +xmlpt.getAttribute('lat'),
        +xmlpt.getAttribute('lon')
      ];
      var ele = $( xmlpt ).find("ele");
      if (this.getmeters && ele.length==1 ) point.push(+ele.text());
      points.push(point);
    }
    return points;
  };
};