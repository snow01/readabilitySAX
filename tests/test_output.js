require("fs").readFile(__dirname + "/testpage.html", function(a,b){debug(b.toString("utf8"));});

var getReadableContent = require("../"),
	Parser = require("htmlparser2/lib/Parser.js"),
	Readability = require("../readabilitySAX.js");

function debug(data){
	var readable = new Readability({
		pageURL: "http://howtonode.org/heat-tracer/",
		resolvePaths: true
	}),
		parser = new Parser(readable);
	
	parser.parseComplete(data);
	
	var data = readable.getArticle();
	
	test(JSON.stringify(data), JSON.stringify(expected_data),
		"didn't got expected output!");
	test(require("util").inspect(readable._currentElement,false,1/0).length, 1111934, 
		"tree had false size!");
	test(Object.keys(readable._scannedLinks).length, expected_links, 
		"wrong number of links!");
	
	testURL();

	console.log("Passed!");
};

function testURL(){
	var readable = new Readability({
		pageURL: "http://foo.bar/this.2/is/a/long/path/index?isnt=it",
		resolvePaths: true
	});
	
	test(JSON.stringify(readable._url), JSON.stringify(expected_url), "wrong url");
	test(readable._baseURL, "http://foo.bar/this.2/is/a/long/path", "wrong base");
	test(readable._convertLinks("../asdf/foo/"), "http://foo.bar/this.2/is/a/long/asdf/foo/", "link1 wasn't resolved!");
	test(readable._convertLinks("/asdf/foo/"), "http://foo.bar/asdf/foo/", "link2 wasn't resolved!");
	test(readable._convertLinks("foo/"), "http://foo.bar/this.2/is/a/long/path/foo/", "link3 wasn't resolved!");
};

function test(got, expected, message){
	if(got !== expected){
		console.log(got);
		throw Error(message);
	}
};

var expected_links = 2;

var expected_url = {"protocol":"http:","domain":"foo.bar","path":["this.2","is","a","long","path"],"full":"http://foo.bar/this.2/is/a/long/path/index?isnt=it"};

var expected_data = { title: 'Realtime Performance Visualizations using Node.js - How To Node',
  nextPage: 'http://howtonode.org/heat-tracer/dummy/page/2',
  textLength: 12071,
  score: 83,
  html: '<div><a href="http://howtonode.org/243bfe84f43affd3244e1828d90a8dca7fcc34c4/heat-tracer">Static Version</a><p>This article outlines how to create a realtime heatmap of your syscall latency using HTML5, some great node modules, and DTrace. It was inspired by talk that Bryan Cantrill and Brendan Greg gave on Joyent\'s cool cloud analytics tools. While specific, the code provided could easily be adapted to provide a heatmap of any type of aggregation Dtrace is capable of providing. </p>\n\n<h2>System Requirements</h2>\n\n<p>First thing\'s first, you\'re going to need a system with DTrace. This likely means Solaris (or one of its decedents), OS X, or a BSD variant.  There doesn\'t appear to be Dtrace available for Linux. </p>\n\n<h2>Security</h2>\n\n<p>Secondly, please be aware that at the time of writing the demo code contains a fairly substantial secruity vulnerabilty. Namely the d script is sent from the client with no authentication what so ever. If you bind to localhost this shouldn\'t be a big deal for a demo. Time permitting I intend to clean up the code.  </p>\n\n<h2>Dependencies</h2>\n\n<p>For this tutorial you\'ll also need:</p>\n\n<pre><code><span>node </span><span>-</span><span> http</span><span>:</span><span>//nodejs.org/#download (duh)</span><span><br/>npm </span><span>-</span><span> https</span><span>:</span><span>//github.com/isaacs/npm (makes installing modules a breeze)</span><span><br/>node</span><span>-</span><span>libdtrace </span><span>-</span><span> https</span><span>:</span><span>//github.com/bcantrill/node-libdtrace (provides dtrace functionality)</span><span><br/></span><span>Socket</span><span>.</span><span>IO </span><span>-</span><span> </span><span>\'npm install socket.io\'</span><span> </span><span>(</span><span>web sockets made easy</span><span>)</span><span><br/></span></code></pre>\n\n<h2>Server</h2>\n\n<p>Now we\'re ready to start writing our web server: </p>\n\n<p><embed src="http://youtube.com/"></embed> This is just a test embed! </p>\n\n<div><a href="http://howtonode.org/heat-tracer/heat-tracer/heat_tracer.js">heat_tracer.js</a><pre><code><span>var</span><span> http </span><span>=</span><span> </span><span>require</span><span>(</span><span>\'http\'</span><span>);</span><span><br/></span><span>var</span><span> libdtrace </span><span>=</span><span> </span><span>require</span><span>(</span><span>\'libdtrace\'</span><span>);</span><span><br/></span><span>var</span><span> io </span><span>=</span><span> </span><span>require</span><span>(</span><span>\'socket.io\'</span><span>);</span><span><br/></span><span>var</span><span> express </span><span>=</span><span> </span><span>require</span><span>(</span><span>\'express\'</span><span>);</span><span><br/></span><span>/* create our express server and prepare to serve javascript files in ./public <br/>*/</span><span><br/></span><span>var</span><span> app </span><span>=</span><span> express</span><span>.</span><span>createServer</span><span>();</span><span><br/>app</span><span>.</span><span>configure</span><span>(</span><span>function</span><span>(){</span><span><br/>app</span><span>.</span><span>use</span><span>(</span><span>express</span><span>.</span><span>staticProvider</span><span>(</span><span>__dirname </span><span>+</span><span> </span><span>\'/public\'</span><span>));</span><span><br/></span><span>});</span><span><br/></span><span>/* Before we go any further we must realize that each time a user connects we\'re going to want to <br/>them send them dtrace aggregation every second. We can do so using \'setInterval\', but we must<br/>keep track of both the intervals we set and the dtrace consumers that are created as we\'ll need <br/>them later when the client disconnects. <br/>*/</span><span><br/></span><span>var</span><span> interval_id_by_session_id </span><span>=</span><span> </span><span>{};</span><span><br/></span><span>var</span><span> dtp_by_session_id </span><span>=</span><span> </span><span>{};</span><span><br/></span><span>/* In order to effecienctly send packets we\'re going to use the Socket.IO library which seemlessly <br/>integrates with express. &nbsp;<br/>*/</span><span><br/></span><span>var</span><span> websocket_server </span><span>=</span><span> io</span><span>.</span><span>listen</span><span>(</span><span>app</span><span>);</span><span> <br/></span><span>/* Now that we have a web socket server, we need to create a handler for connection events. These <br/>events represet a client connecting to our server */</span><span><br/>websocket_server</span><span>.</span><span>on</span><span>(</span><span>\'connection\'</span><span>,</span><span> </span><span>function</span><span>(</span><span>socket</span><span>)</span><span> </span><span>{</span><span> <br/></span><span>/* Like the web server object, we must also define handlers for various socket events that <br/>will happen during the lifetime of the connection. These will define how we interact with<br/>the client. The first is a message event which occurs when the client sends something to<br/>the server. */</span><span><br/>socket</span><span>.</span><span>on</span><span>(</span><span> </span><span>\'message\'</span><span>,</span><span> </span><span>function</span><span>(</span><span>message</span><span>)</span><span> </span><span>{</span><span> <br/></span><span>/* The only message the client ever sends will be sent right after connecting. &nbsp;<br/>So it will happen only once during the lifetime of a socket. This message also <br/>contains a d script which defines an agregation to walk. <br/>*/</span><span><br/></span><span>var</span><span> dtp </span><span>=</span><span> </span><span>new</span><span> libdtrace</span><span>.</span><span>Consumer</span><span>();</span><span><br/></span><span>var</span><span> dscript </span><span>=</span><span> message</span><span>[</span><span>\'dscript\'</span><span>];</span><span><br/>console</span><span>.</span><span>log</span><span>(</span><span> dscript </span><span>);</span><span><br/>dtp</span><span>.</span><span>strcompile</span><span>(</span><span>dscript</span><span>);</span><span> &nbsp; &nbsp; &nbsp; &nbsp;<br/>dtp</span><span>.</span><span>go</span><span>();</span><span><br/>dtp_by_session_id</span><span>[</span><span>socket</span><span>.</span><span>sessionId</span><span>]</span><span> </span><span>=</span><span> dtp</span><span>;</span><span><br/></span><span>/* All that\'s left to do is send the aggration data from the dscript. &nbsp;*/</span><span><br/>interval_id_by_session_id</span><span>[</span><span>socket</span><span>.</span><span>sessionId</span><span>]</span><span> </span><span>=</span><span> setInterval</span><span>(</span><span>function</span><span> </span><span>()</span><span> </span><span>{</span><span><br/></span><span>var</span><span> aggdata </span><span>=</span><span> </span><span>{};</span><span><br/></span><span>try</span><span> </span><span>{</span><span> <br/>dtp</span><span>.</span><span>aggwalk</span><span>(</span><span>function</span><span> </span><span>(</span><span>id</span><span>,</span><span> key</span><span>,</span><span> val</span><span>)</span><span> </span><span>{</span><span><br/></span><span>for</span><span>(</span><span> index </span><span>in</span><span> val </span><span>)</span><span> </span><span>{</span><span><br/></span><span>/* console.log( \'key: \' + key + \', interval: \' + <br/>val[index][0][0] + \'-\' + val[index][0][1], \', count \' + val[index][1] ); */</span><span><br/>aggdata</span><span>[</span><span>key</span><span>]</span><span> </span><span>=</span><span> val</span><span>;</span><span><br/></span><span>}</span><span><br/></span><span>}</span><span> </span><span>);</span><span><br/>socket</span><span>.</span><span>send</span><span>(</span><span> aggdata </span><span>);</span><span> <br/></span><span>}</span><span> </span><span>catch</span><span>(</span><span> err </span><span>)</span><span> </span><span>{</span><span><br/>console</span><span>.</span><span>log</span><span>(</span><span>err</span><span>);</span><span><br/></span><span>}</span><span><br/></span><span>},</span><span> &nbsp;</span><span>1001</span><span> </span><span>);</span><span><br/></span><span>}</span><span> </span><span>);</span><span><br/></span><span>/* Not so fast. If a client disconnects we don\'t want their respective dtrace consumer to <br/>keep collecting data any more. We also don\'t want to try to keep sending anything to them<br/>period. So clean up. */</span><span><br/>socket</span><span>.</span><span>on</span><span>(</span><span>\'disconnect\'</span><span>,</span><span> </span><span>function</span><span>(){</span><span> <br/>clearInterval</span><span>(</span><span>clearInterval</span><span>(</span><span>interval_id_by_session_id</span><span>[</span><span>socket</span><span>.</span><span>sessionId</span><span>]));</span><span><br/></span><span>var</span><span> dtp </span><span>=</span><span> dtp_by_session_id</span><span>[</span><span>socket</span><span>.</span><span>sessionId</span><span>];</span><span><br/></span><span>delete</span><span> dtp_by_session_id</span><span>[</span><span>socket</span><span>.</span><span>sessionId</span><span>];</span><span> <br/>dtp</span><span>.</span><span>stop</span><span>();</span><span> &nbsp; &nbsp; <br/>console</span><span>.</span><span>log</span><span>(</span><span>\'disconnected\'</span><span>);</span><span><br/></span><span>});</span><span><br/></span><span>}</span><span> </span><span>);</span><span><br/>app</span><span>.</span><span>listen</span><span>(</span><span>80</span><span>);</span></code></pre></div>\n\n<h2>Client</h2>\n\n<p>In order to display our heatmap, we\'re going to need some basic HTML with a canvas element:</p>\n\n<div><a href="http://howtonode.org/heat-tracer/heat-tracer/public/heat_tracer.html">public/heat_tracer.html</a><pre><code><span>&lt;html&gt;</span><span><br/></span><span>&lt;head&gt;</span><span><br/></span><span>&lt;script</span><span> </span><span>src</span><span>=</span><span>"http://localhost/socket.io/socket.io.js"</span><span>&gt;&lt;/script&gt;</span><span> <br/></span><span>&lt;script</span><span> </span><span>src</span><span>=</span><span>"http://localhost/heat_tracer_client.js"</span><span>&gt;&lt;/script&gt;</span><span> <br/></span><span>&lt;/head&gt;</span><span><br/></span><span>&lt;body</span><span> </span><span>onLoad</span><span>=</span><span>\'</span><span>heat_tracer</span><span>()</span><span>\'</span><span>&gt;</span><span><br/></span><span>&lt;canvas</span><span> </span><span>id</span><span>=</span><span>\'canvas\'</span><span> </span><span>width</span><span>=</span><span>\'1024\'</span><span> </span><span>height</span><span>=</span><span>\'512\'</span><span>&gt;&lt;/canvas&gt;</span><span><br/></span><span>&lt;/body&gt;</span><span><br/></span><span>&lt;/html&gt;</span></code></pre></div>\n\n<p>Finally the JavaScript client which translates the raw  streaming data into pretty picture:</p>\n\n<div><a href="http://howtonode.org/heat-tracer/heat-tracer/public/heat_tracer_client.js">public/heat_tracer_client.js</a><pre><code><span>/* On load we create our web socket (or flash socket if your browser doesn\'t support it ) and<br/>send the d script we wish to be tracing. This extremely powerful and *insecure*. */</span><span><br/></span><span>function</span><span> heat_tracer</span><span>()</span><span> </span><span>{</span><span> <br/></span><span>//Global vars</span><span><br/>setup</span><span>();</span><span><br/></span><span>var</span><span> socket </span><span>=</span><span> </span><span>new</span><span> io</span><span>.</span><span>Socket</span><span>(</span><span>\'localhost\'</span><span>);</span><span> </span><span>//connect to localhost presently</span><span><br/>socket</span><span>.</span><span>connect</span><span>();</span><span><br/>socket</span><span>.</span><span>on</span><span>(</span><span>\'connect\'</span><span>,</span><span> </span><span>function</span><span>(){</span><span> <br/>console</span><span>.</span><span>log</span><span>(</span><span>\'on connection\'</span><span>);</span><span><br/></span><span>var</span><span> dscript </span><span>=</span><span> </span><span>"syscall:::entry\\n{\\nself-&gt;syscall_entry_ts[probefunc] = vtimestamp;\\n}\\nsyscall:::return\\n/self-&gt;syscall_entry_ts[probefunc]/\\n{\\n\\n@time[probefunc] = lquantize((vtimestamp - self-&gt;syscall_entry_ts[probefunc] ) / 1000, 0, 63, 2);\\nself-&gt;syscall_entry_ts[probefunc] = 0;\\n}"</span><span>;</span><span><br/>socket</span><span>.</span><span>send</span><span>(</span><span> </span><span>{</span><span> </span><span>\'dscript\'</span><span> </span><span>:</span><span> dscript </span><span>}</span><span> </span><span>);</span><span><br/></span><span>});</span><span><br/></span><span>/* The only messages we recieve should contain contain the dtrace aggregation data we requested<br/>on connection. */</span><span><br/>socket</span><span>.</span><span>on</span><span>(</span><span>\'message\'</span><span>,</span><span> </span><span>function</span><span>(</span><span>message</span><span>){</span><span> <br/></span><span>//console.log( message );</span><span><br/>draw</span><span>(</span><span>message</span><span>);</span><span><br/></span><span>/* for ( key in message ) {<br/>val = message[key];<br/>console.log( \'key: \' + key + \', interval: \' + val[0][0] + \'-\' + val[0][1], \', count \' + val[1] );<br/>} &nbsp;<br/>*/</span><span><br/></span><span>});</span><span><br/>socket</span><span>.</span><span>on</span><span>(</span><span>\'disconnect\'</span><span>,</span><span> </span><span>function</span><span>(){</span><span> <br/></span><span>});</span><span><br/></span><span>}</span><span><br/></span><span>/* Take the aggregation data and update the heatmap */</span><span><br/></span><span>function</span><span> draw</span><span>(</span><span>message</span><span>)</span><span> </span><span>{</span><span> &nbsp;<br/></span><span>/* Latest data goes in the right most column, initialize it */</span><span><br/></span><span>var</span><span> syscalls_by_latency </span><span>=</span><span> </span><span>[];</span><span><br/></span><span>for</span><span> </span><span>(</span><span> </span><span>var</span><span> index </span><span>=</span><span> </span><span>0</span><span>;</span><span> index </span><span>&lt;</span><span> </span><span>32</span><span>;</span><span> index</span><span>++</span><span> </span><span>)</span><span> </span><span>{</span><span><br/>syscalls_by_latency</span><span>[</span><span>index</span><span>]</span><span> </span><span>=</span><span> </span><span>0</span><span>;</span><span><br/></span><span>}</span><span><br/></span><span>/* Presently we have the latency for each system call quantized in our message. Merge the data<br/>such that we have all the system call latency quantized together. This gives us the number<br/>of syscalls made with latencies in each particular band. */</span><span><br/></span><span>for</span><span> </span><span>(</span><span> </span><span>var</span><span> syscall </span><span>in</span><span> message </span><span>)</span><span> </span><span>{</span><span><br/></span><span>var</span><span> val </span><span>=</span><span> message</span><span>[</span><span>syscall</span><span>];</span><span><br/></span><span>for</span><span> </span><span>(</span><span> result_index </span><span>in</span><span> val </span><span>)</span><span> </span><span>{</span><span><br/></span><span>var</span><span> latency_start </span><span>=</span><span> val</span><span>[</span><span>result_index</span><span>][</span><span>0</span><span>][</span><span>0</span><span>];</span><span><br/></span><span>var</span><span> count </span><span>=</span><span> &nbsp;val</span><span>[</span><span>result_index</span><span>][</span><span>1</span><span>];</span><span><br/></span><span>/* The d script we\'re using lquantizes from 0 to 63 in steps of two. So dividing by 2 <br/>tells us which row this result belongs in */</span><span><br/>syscalls_by_latency</span><span>[</span><span>Math</span><span>.</span><span>floor</span><span>(</span><span>latency_start</span><span>/</span><span>2</span><span>)]</span><span> </span><span>+=</span><span> count</span><span>;</span><span> &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;<br/></span><span>}</span><span><br/></span><span>}</span><span><br/></span><span>/* We just created a new column, shift the console to the left and add it. */</span><span><br/>console_columns</span><span>.</span><span>shift</span><span>();</span><span><br/>console_columns</span><span>.</span><span>push</span><span>(</span><span>syscalls_by_latency</span><span>);</span><span><br/>drawArray</span><span>(</span><span>console_columns</span><span>);</span><span><br/></span><span>}</span><span><br/></span><span>/* Draw the columns and rows that map up the heatmap on to the canvas element */</span><span><br/></span><span>function</span><span> drawArray</span><span>(</span><span>console_columns</span><span>)</span><span> </span><span>{</span><span><br/></span><span>var</span><span> canvas </span><span>=</span><span> document</span><span>.</span><span>getElementById</span><span>(</span><span>\'canvas\'</span><span>);</span><span><br/></span><span>if</span><span> </span><span>(</span><span>canvas</span><span>.</span><span>getContext</span><span>)</span><span> </span><span>{</span><span><br/></span><span>var</span><span> ctx </span><span>=</span><span> canvas</span><span>.</span><span>getContext</span><span>(</span><span>\'2d\'</span><span>);</span><span> &nbsp;<br/></span><span>for</span><span> </span><span>(</span><span> </span><span>var</span><span> column_index </span><span>in</span><span> console_columns </span><span>)</span><span> </span><span>{</span><span><br/></span><span>var</span><span> column </span><span>=</span><span> console_columns</span><span>[</span><span>column_index</span><span>];</span><span> &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <br/></span><span>for</span><span> </span><span>(</span><span> </span><span>var</span><span> entry_index </span><span>in</span><span> column </span><span>)</span><span> </span><span>{</span><span><br/>entry </span><span>=</span><span> column</span><span>[</span><span>entry_index</span><span>];</span><span><br/></span><span>/* We\'re using a logarithmic scale for the brightness. This was all arrived at by<br/>trial and error and found to work well on my Mac. &nbsp;In the future this <br/>could all be adjustable with controls */</span><span><br/></span><span>var</span><span> red_value </span><span>=</span><span> </span><span>0</span><span>;</span><span> &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;<br/></span><span>if</span><span> </span><span>(</span><span> entry </span><span>!=</span><span> </span><span>0</span><span> </span><span>)</span><span> </span><span>{</span><span><br/>red_value </span><span>=</span><span> </span><span>Math</span><span>.</span><span>floor</span><span>(</span><span>Math</span><span>.</span><span>log</span><span>(</span><span>entry</span><span>)/</span><span>Math</span><span>.</span><span>log</span><span>(</span><span>2</span><span>));</span><span> &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp;<br/></span><span>}</span><span><br/></span><span>//console.log(red_value); &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; </span><span><br/>ctx</span><span>.</span><span>fillStyle </span><span>=</span><span> </span><span>\'rgb(\'</span><span> </span><span>+</span><span> </span><span>(</span><span>red_value </span><span>*</span><span> </span><span>25</span><span>)</span><span> </span><span>+</span><span> </span><span>\',0,0)\'</span><span>;</span><span><br/>ctx</span><span>.</span><span>fillRect</span><span>(</span><span>column_index</span><span>*</span><span>16</span><span>,</span><span> </span><span>496</span><span>-(</span><span>entry_index</span><span>*</span><span>16</span><span>),</span><span> </span><span>16</span><span>,</span><span> </span><span>16</span><span>);</span><span><br/></span><span>}</span><span> <br/></span><span>}</span><span><br/></span><span>}</span><span><br/></span><span>}</span><span><br/></span><span>/* The heatmap is is really a 64x32 grid. Initialize the array which contains the grid data. */</span><span><br/></span><span>function</span><span> setup</span><span>()</span><span> </span><span>{</span><span><br/>console_columns </span><span>=</span><span> </span><span>[];</span><span><br/></span><span>for</span><span> </span><span>(</span><span> </span><span>var</span><span> column_index </span><span>=</span><span> </span><span>0</span><span>;</span><span> column_index </span><span>&lt;</span><span> </span><span>64</span><span>;</span><span> column_index</span><span>++</span><span> </span><span>)</span><span> </span><span>{</span><span><br/></span><span>var</span><span> column </span><span>=</span><span> </span><span>[];</span><span><br/></span><span>for</span><span> </span><span>(</span><span> </span><span>var</span><span> entry_index </span><span>=</span><span> </span><span>0</span><span>;</span><span> entry_index </span><span>&lt;</span><span> </span><span>32</span><span>;</span><span> entry_index</span><span>++</span><span> </span><span>)</span><span> </span><span>{</span><span> <br/>column</span><span>[</span><span>entry_index</span><span>]</span><span> </span><span>=</span><span> </span><span>0</span><span>;</span><span><br/></span><span>}</span><span><br/>console_columns</span><span>.</span><span>push</span><span>(</span><span>column</span><span>);</span><span><br/></span><span>}</span><span><br/></span><span>}</span></code></pre></div>\n\n<h2>Run It!</h2>\n\n<p>Run Heat Tacer with the following. Note, sudo is required by dtrace as it does kernal magic.</p>\n\n<pre><code><span>sudo node heat_tracer</span><span>.</span><span>js<br/></span></code></pre>\n\n<p>If all goes well you should see something a moving version of something like the image below.</p>\n\n<blockquote>\n  <p><img src="http://howtonode.org/heat-tracer/heat_tracer.png" alt="Alt value of image" title=""></img> </p>\n</blockquote>\n\n<h2>Contribute</h2>\n\n<p>You can find the latest version of Heat Tracer <a href="https://github.com/gflarity/Heat-Tracer">here</a>. It is my hope that this article will provide the ground work for a much more abitious performance analytics project. If you\'re interested in contributing please let me know.</p>\n\n<h2>Further Research</h2>\n\n<p>More information about Bryan and Brendan\'s demo can be found <a href="http://dtrace.org/blogs/brendan/2011/01/24/cloud-analytics-first-video/">here</a>.</p>\n\n<p>Socket.IO can be found <a href="http://socket.io/">here</a>.</p><hr></hr>\n\n<a href="http://disqus.com/forums/howtonodeorg/?url=ref">View the discussion thread.</a><a href="http://disqus.com">blog comments powered by</a>\n\n</div>' };