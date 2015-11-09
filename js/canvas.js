$(function(){
	(function(){
		var canvas,ctx;
		//indicate which edit tool is selected
		var toolFlag='free';
		//
		var isfinished=true;
		//startpoint and endpoint for editing operations
		var startpoint=new point(), endpoint=new point();
		//for moving 
		var globalSelected=false, globalSelectedID;
		//block starpoint and endpoint
		var bsp=new point(), bep=new point();
		//freeline's track points
		var freelinepts=[];
		//stack and stack pointer
		var stack=[];
		var ptr=-1;
		var blockstack=[];
		var fakeBlockStack=[];
		//distance for selection detection
		var distance=10;
		//init canvas size
		initCanvas();

		function initCanvas(){
			var width=$('#canvasField').width();
			var height=$('#canvasField').height();
			canvas=document.getElementById('myCanvas');
			ctx=canvas.getContext('2d');
			ctx.canvas.height=Math.round(height)*0.99;
			ctx.canvas.width=Math.round(width)*0.99;
		}

		//bound functions with buttons and radios
		$('#clear').click(clearFunc);
		$('#undo').click(undo);
		$('#redo').click(redo);

		$("[name='drawing']").change(function(){
			toolFlag=$(this).attr('id');
		});

		$('#myCanvas').mousedown(function(e){
			//start editing, set finish flag true
			isfinished=false;
			var offset=$('#myCanvas').offset();
			//record the mounsdown position
			startpoint.x=e.pageX-offset.left;
			startpoint.y=e.pageY-offset.top;
			//update block boundary
			bsp.x=e.pageX-offset.left;
			bsp.y=e.pageY-offset.top;
			bep.x=e.pageX-offset.left;
			bep.y=e.pageY-offset.top;
			//clear freeline track points for potential use
			freelinepts=[];

			switch(toolFlag){
				//store freeline's track points
				case 'free' : { break; }
				case 'line' : { break; }
				case 'rectangle' : { break; }
				case 'circle' : {break;}
				case 'move' : { 
								var returnVals=isSelected(startpoint);
								globalSelected=returnVals[0];
								globalSelectedID=returnVals[1];	
								if(globalSelected){
									var eve=new editEvent('move', globalSelectedID, startpoint, startpoint);
									storeEve(eve);
								}
								break; 
							}
				case 'delete' : { break; }

				default : break;
			}
		});

		$('#myCanvas').mousemove(function (e){
			if(!isfinished){
				switch(toolFlag){
					//draw freeline during mousemoving, update the end piont for the rests
					case 'free' : { 
									trackFree(e); 
									updateEndPoint(e); 
									drawingfreeline(e); 
									break; 
								}
					case 'line' : { 
									updateEndPoint(e); 
									drawingline(e); 
									break; 
								}
					case 'rectangle' : { 
										updateEndPoint(e); 
										drawingrectangle(e); 
										break; 
									}
					case 'circle' : { 
									updateEndPoint(e); 
									drawingcircle(e); 
									break; 
								}
					case 'move' : { 
									updateEndPoint(e); 
									movingObj(e);
									break; 
								}
					case 'delete' : { break; }
					default : break;
				}
			}
		});

		$('#myCanvas').mouseup(function(e){
			//finished, reset the flag
			isfinished=true;
			switch(toolFlag){
				//store objects then draw them, freelines are drawn during the mousemove event
				case 'free' : { 
								var obj=new object('freeline', freelinepts);
								var newBlock=new block(bsp,bep,obj,false);
								blockstack.push(newBlock);
								var eve=new editEvent('draw', blockstack.length-1);
								storeEve(eve);
								break; 
							}
				case 'line' : { 
								var obj=new object('line',startpoint,endpoint);
								var newBlock=new block(bsp,bep,obj,false);
								blockstack.push(newBlock);
								var eve=new editEvent('draw', blockstack.length-1);
								storeEve(eve);
								break; 
							}
				case 'rectangle' : { 
										var obj=new object('rectangle',startpoint,endpoint);
										var newBlock=new block(bsp,bep,obj,false);
										blockstack.push(newBlock);
										var eve=new editEvent('draw', blockstack.length-1);
										storeEve(eve);
										break; 
									}
				case 'circle' : { 
									var r=Math.sqrt((endpoint.x-startpoint.x)*(endpoint.x-startpoint.x)+(endpoint.y-startpoint.y)*(endpoint.y-startpoint.y));
									var obj=new object('circle',startpoint,r);
									//update block to cover the entire circle
									bep.x=startpoint.x+r;
									bep.y=startpoint.y+r;
									bsp.x=startpoint.x-r;
									bsp.y=startpoint.y-r;
									var newBlock=new block(bsp,bep,obj,false);
									blockstack.push(newBlock);
									var eve=new editEvent('draw', blockstack.length-1);
									storeEve(eve);
									break;
								}
				case 'move' : { 
								//update moved objects
								if(globalSelected){
									//current event
									var eve=new editEvent('move', globalSelectedID, startpoint, endpoint);
									stack.pop();
									ptr--;
									storeEve(eve);
								}
								break; 
							}
				case 'delete' : { 
								var returnVals=isSelected(startpoint);
								var selected=returnVals[0];
								var index=returnVals[1];	
								if(selected){
									var eve=new editEvent('delete', index, startpoint);
									storeEve(eve);
								}	
								break; 
							}
				default : break;
			}
		});

		function clearFunc(){
			location.reload();
		}

		function updateEndPoint(e){
			var offset=$('#myCanvas').offset();
			endpoint.x=e.pageX-offset.left;
			endpoint.y=e.pageY-offset.top;
			updateBlockPoint(endpoint);
		}

		function updateBlockPoint(point){
			bsp.x=Math.min(bsp.x,point.x);
			bsp.y=Math.min(bsp.y,point.y);
			bep.x=Math.max(bep.x,point.x);
			bep.y=Math.max(bep.y,point.y);
		}

		function movingObj(e){
			//update moved objects
			if(globalSelected){
				//current event
				var eve=new editEvent('move', globalSelectedID, startpoint, endpoint);
				stack.pop();
				ptr--;
				storeEve(eve);
			}
		}

		//animation of drawing a segment, future implementation
		function drawingline(e){
			//deep copy of block stack
			fakeBlockStack=JSON.parse(JSON.stringify(blockstack));
			clearCanvas();
			//apply events on fake block stack
			for(var i=0;i<=ptr;i++){
				operEve(stack[i]);
			}
			//run all draw operation
			for(var i=0;i<=ptr;i++){
				if(stack[i].type=='draw'&&!fakeBlockStack[stack[i].ind].flag){
					drawobject(fakeBlockStack[stack[i].ind].obj);
				}
			}
			ctx.beginPath();
			ctx.moveTo(startpoint.x,startpoint.y);
			ctx.lineTo(endpoint.x,endpoint.y);
			ctx.stroke();
		}

		//animation of drawing rectangle, future implementation
		function drawingrectangle(e){
			//deep copy of block stack
			fakeBlockStack=JSON.parse(JSON.stringify(blockstack));
			clearCanvas();
			//apply events on fake block stack
			for(var i=0;i<=ptr;i++){
				operEve(stack[i]);
			}
			//run all draw operation
			for(var i=0;i<=ptr;i++){
				if(stack[i].type=='draw'&&!fakeBlockStack[stack[i].ind].flag){
					drawobject(fakeBlockStack[stack[i].ind].obj);
				}
			}
			ctx.beginPath();
			ctx.moveTo(startpoint.x,startpoint.y);
			ctx.rect(startpoint.x,startpoint.y,endpoint.x-startpoint.x,endpoint.y-startpoint.y);
			ctx.stroke();	
		}

		function drawingfreeline(e){
			//deep copy of block stack
			fakeBlockStack=JSON.parse(JSON.stringify(blockstack));
			clearCanvas();
			//apply events on fake block stack
			for(var i=0;i<=ptr;i++){
				operEve(stack[i]);
			}
			//run all draw operation
			for(var i=0;i<=ptr;i++){
				if(stack[i].type=='draw'&&!fakeBlockStack[stack[i].ind].flag){
					drawobject(fakeBlockStack[stack[i].ind].obj);
				}
			}
			ctx.beginPath();
			for(var i=1;i<freelinepts.length;i++){
				ctx.moveTo(freelinepts[i-1].x,freelinepts[i-1].y);
				ctx.lineTo(freelinepts[i].x,freelinepts[i].y);
				ctx.stroke();  
			}
		}

		function drawingcircle(e){
			//deep copy of block stack
			fakeBlockStack=JSON.parse(JSON.stringify(blockstack));
			clearCanvas();
			//apply events on fake block stack
			for(var i=0;i<=ptr;i++){
				operEve(stack[i]);
			}
			//run all draw operation
			for(var i=0;i<=ptr;i++){
				if(stack[i].type=='draw'&&!fakeBlockStack[stack[i].ind].flag){
					drawobject(fakeBlockStack[stack[i].ind].obj);
				}
			}
			var r=Math.sqrt((endpoint.x-startpoint.x)*(endpoint.x-startpoint.x)+(endpoint.y-startpoint.y)*(endpoint.y-startpoint.y));
			ctx.beginPath();
			ctx.arc(startpoint.x,startpoint.y,r,0,2*Math.PI);
			ctx.stroke();	
		}

		//detect selection, iterately find out selected object in the stack.
		//performance can be improved after redesign the object class
		function isSelected(sptr){
			var selected=false;
			var index=-1;
			for(var i=0;i<fakeBlockStack.length;i++){
				if(!fakeBlockStack[i].flag){
					if(sptr.x<fakeBlockStack[i].startpoint.x||sptr.x>fakeBlockStack[i].endpoint.x||sptr.y<fakeBlockStack[i].startpoint.y||sptr.y>fakeBlockStack[i].endpoint.y)
						continue;
					else{
						selected=true;
						index=i;
						break;
					}
				}
			}
			return [selected,index];
		}

		//delete obj
		function deleteObj(index){
			blockstack[index].flag=true;
		}

		function moveblk(blk, sptr,eptr){
			blk.startpoint.x+=eptr.x-sptr.x;
			blk.startpoint.y+=eptr.y-sptr.y;
			blk.endpoint.x+=eptr.x-sptr.x;
			blk.endpoint.y+=eptr.y-sptr.y;
			moveObj(blk.obj,sptr,eptr);	
		}

		function moveObj(obj, sptr, eptr){
			switch(obj.type){
				case 'freeline' : {
					for(var j=0;j<obj.points.length;j++){
						obj.points[j].x+=eptr.x-sptr.x;
						obj.points[j].y+=eptr.y-sptr.y;
					}
					break;
				}
				case 'line' : {
					obj.startpoint.x+=eptr.x-sptr.x;
					obj.startpoint.y+=eptr.y-sptr.y;
					obj.endpoint.x+=eptr.x-sptr.x;
					obj.endpoint.y+=eptr.y-sptr.y;
					break;
				}
				case 'rectangle' : {
					obj.startpoint.x+=eptr.x-sptr.x;
					obj.startpoint.y+=eptr.y-sptr.y;
					obj.endpoint.x+=eptr.x-sptr.x;
					obj.endpoint.y+=eptr.y-sptr.y;
					break;
				}
				case 'circle' : {
					obj.center.x+=eptr.x-sptr.x;
					obj.center.y+=eptr.y-sptr.y;
					break;
				}

				default : break;
			}
		}
		//draw free line
		function trackFree(e){
			var offset=$('#myCanvas').offset();
			var x=e.pageX-offset.left;
			var y=e.pageY-offset.top;
			var p=new point(x,y);
			freelinepts.push(p);
		}

		//sum of different drawing functions
		function drawobject(obj){
			switch(obj.type){
				case 'line' : { drawline(obj.startpoint,obj.endpoint); break; }
				case 'rectangle' : { drawrectangle(obj.startpoint,obj.endpoint); break; }
				case 'freeline' : { drawfreeline(obj); break; }
				case 'circle' : { drawcircle(obj.center,obj.r); break;}

				default : break;
			}
		}

		//redraw free line, can be combined with 'draw free line' function in the future
		function drawfreeline(obj){
			var arr=obj.points;
			ctx.beginPath();
			ctx.moveTo(arr[0].x,arr[0].y);
			for(var i=1;i<arr.length;i++){
				ctx.lineTo(arr[i].x,arr[i].y);
				ctx.stroke();  
			}
		}

		//draw line
		function drawline(sptr,eptr){
			ctx.beginPath();
			ctx.moveTo(sptr.x,sptr.y);
			ctx.lineTo(eptr.x,eptr.y);
			ctx.stroke();
		}

		//draw circle
		function drawcircle(sptr,r){
			ctx.beginPath();
			ctx.arc(sptr.x,sptr.y,r,0,2*Math.PI);
			ctx.stroke();			
		}

		//draw rectangle
		function drawrectangle(sptr,eptr){
			ctx.beginPath();
			ctx.moveTo(sptr.x,sptr.y);
			ctx.rect(sptr.x,sptr.y,eptr.x-sptr.x,eptr.y-sptr.y);
			ctx.stroke();	
		}

		//clear canvas
		function clearCanvas(){
			ctx.clearRect(0,0,$('#myCanvas').width(),$('#myCanvas').height());
		}

		//undo
		function undo(){
			if(ptr>=0){
				//deep copy of block stack
				fakeBlockStack=JSON.parse(JSON.stringify(blockstack));
				ptr--;
				clearCanvas();
				//apply events on fake block stack
				for(var i=0;i<=ptr;i++){
					operEve(stack[i]);
				}
				//run all draw operation
				for(var i=0;i<=ptr;i++){
					if(stack[i].type=='draw'&&!fakeBlockStack[stack[i].ind].flag){
						drawobject(fakeBlockStack[stack[i].ind].obj);
					}
				}
			}
		}

		//redo
		function redo(){
			if(ptr<stack.length-1){		
				//deep copy of block stack
				fakeBlockStack=JSON.parse(JSON.stringify(blockstack));
				ptr++;
				clearCanvas();
				//apply events on fake block stack
				for(var i=0;i<=ptr;i++){
					operEve(stack[i]);
				}
				//run all draw operation
				for(var i=0;i<=ptr;i++){
					if(stack[i].type=='draw'&&!fakeBlockStack[stack[i].ind].flag){
						drawobject(fakeBlockStack[stack[i].ind].obj);
					}
				}
			}
		}

		//store eve
		function storeEve(eve){
			//deep copy of block stack
			fakeBlockStack=JSON.parse(JSON.stringify(blockstack));
			ptr++;
			if(ptr<stack.length){
				stack.length=ptr;
			}
			
			stack.push(eve);
			clearCanvas();
			//apply events on fake block stack
			for(var i=0;i<=ptr;i++){
				operEve(stack[i]);
			}
			//run all draw operation
			for(var i=0;i<=ptr;i++){
				if(stack[i].type=='draw'&&!fakeBlockStack[stack[i].ind].flag){
					drawobject(fakeBlockStack[stack[i].ind].obj);
				}
			}
			
		}

		//operate eve
		function operEve(eve){
			switch(eve.type){
				case 'draw' : {
					break;
				}
				case 'move' : {
					moveblk(fakeBlockStack[eve.ind], eve.startpoint,eve.endpoint);
					break;
				}
				case 'delete' : {
					fakeBlockStack[eve.ind].flag=true;
					break;
				}
				
				default : break;
			}
		}

	})();
});