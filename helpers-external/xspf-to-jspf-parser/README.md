XSPF to JSPF Parser in Javascript

This is a parser released under the LGPL 3, which allows you to parse and use XSPF playlists in your browser-side javascript code. It outputs a Javascript object that conforms to the specification of JSPF. It is hoped that by standardizing a JSON format for XSPF, an ecosystem of free browser based music players will arise.


Usage

Usage is simple. First, acquire an XML DOM for the XSPF you wish to parse. (see below.) Now that you have the xml document object, just pass it to the parser.

  var jspf = XSPF.toJSPF(xmldom);
    
Accessing values is easy. The style is plain old javascript:

  var title = jspf.playlist.title;
  var tracks = jspf.playlist.track;
  var first_annotation = tracks[0].annotation;
  var first_location = tracks[0].location[0];
    
The complete reference to the JSPF object is contained in the specification. If you don't have Firebug, get it, it will let you just click around the object graph. There is no more useful Javascript coder's tool.


Getting an XML DOM.

If you are requesting the XSPF using ajax you can usually get the responseXML directly from the transport object. Sometimes headers don't make this easy, or for whatever reason you may have an XSPF string but no DOM. There is a helper function which turns a string into a DOM.

  var xmldom = XSPF.XMLfromString(xspf_string);
    
    
Features

Parses the complete set of elements as specified for JSPF (ie pretty much all of XSPF)
Allows users to plugin parsers for their particular application. Adding a parser is simple:

Playlist level extension parser.

  XSPF.extensionParsers.playlist['http://myapplication.com/v1'] = function(xmlnode) {
    //gets passed each playlist extension node for your application (one at a time)
    ...
    return object or array.
  };
      
Track extension parser.

  XSPF.extensionParsers.track['http://myapplication.com/v1'] = function(xmlnode) {
    //gets passed each playlist extension node for your application (one at a time)
    ...
    return object or array.
  };
      
Leading and trailing whitespace is stripped from around all fields that XSPF specifies as integers or URIs (this is a feature).


Known issues

Doesn't handle namespaces. It should pretty much look the other way if you include foreign namespaces in an XSPF document, but it won't be able to find XSPF if it has been included as a prefix namespace in other XML. If you are a browser XML DOM ninja, you may be able to extract just the namespace for XSPF from a larger context, and feed that to the XSPF parser.
