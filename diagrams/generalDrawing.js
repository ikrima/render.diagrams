function GeneralDrawingTest(docTag)
{
	var canvas;
	var propertyGrid;
	var buttonList;
	var scene;
	var camera;

	var dragStartMousePos		= {x:-1, y:-1};
	var dragStartMousePosPixels	= {x:-1, y:-1};
	var dragStartCamPos 		= {x:-1, y:-1};
	var dragOffset 				= new Vector(0,0);
	var lastMousePosPixels 		= {x:0, y:0}
	var lastMousePos	 		= {x:0, y:0}
		
	var grid 					= new Grid()
	var mouseCursor 			= new MouseCursor(grid);
		
	var tool					= "select";
	var mode					= "";
		
	var selectionList = [];
	var moveOffsets = [];
	var dragPoint = null;
	
	function setup()
	{
		var root = document.getElementById(docTag);
		
		canvas = document.createElement('canvas');
		canvas.width  = 1200;
		canvas.height = 700;
		//canvas.style.width  = "70%";
		//canvas.style.height = 700;
		//canvas.style.align = "left";
		canvas.style.border = "2px solid black";//#99D9EA";
		//canvas.style.margin = "auto";
		canvas.style.marginLeft = 50;
		canvas.style.marginRight = 50;
		//canvas.style.display = "block";
		canvas.style.cursor = "none";
		canvas.addEventListener('mousemove', onMouseMove, false);
		canvas.addEventListener('mousedown', onMouseDown, false);
		canvas.addEventListener('mouseup', onMouseUp, false);
		document.addEventListener('keydown', onKeyDown, false);
		canvas.onwheel = onMouseWheel;
		
		root.appendChild(canvas);

		var propertyGridDock = document.createElement('div');
		propertyGridDock.id = "propertyGrid";
		propertyGridDock.style.border = "2px solid black";
		propertyGridDock.style.width  = 400;
		propertyGridDock.style.height = 700;
		propertyGridDock.style.cssFloat = "right";
		root.appendChild(propertyGridDock);

		propertyGrid = new PropertyGrid(propertyGridDock);

		var buttonListdDock = document.createElement('div');
		buttonListdDock.id = "propertyGrid";
		buttonListdDock.style.border = "2px solid black";
		buttonListdDock.style.width  = 150;
		buttonListdDock.style.height = 700;
		buttonListdDock.style.cssFloat = "left";
		root.appendChild(buttonListdDock);

		buttonList = new PropertyGrid(buttonListdDock);
		buttonList.addProperty(undefined, new Button("Select (Q)", function(){setTool("select");}));
		buttonList.addProperty(undefined, new Button("Modify (V)", function(){setTool("modify");}));

		scene = new Scene();
		camera = new Camera(canvas);
		
		grid.spacing = 1;
		scene.addObject(grid);
		scene.addObject(new Wall( [new Vector(-10, 10), new Vector(-10, 0), new Vector(10, 0), new Vector(10, 10)] ));
		scene.addObject(new ArcWall(new Vector(0, 10), 10,  0*Math.PI/180, 180*Math.PI/180));
		scene.addObject(new BRDFRay(new Vector(0, 10), new Vector(-3,-5),  scene));
		scene.addObject(mouseCursor);

		for (var i = 0; i != scene.objects.length; ++i)
		{
			if (scene.objects[i].addChangeListener !== undefined)
			{
				scene.objects[i].addChangeListener(draw);
			}
		}

		camera.setViewPosition(0, 10);
	}
	
	function setTool(newTool)
	{
		if (newTool == "select")
		{
			if (tool != "select")
			{
				mode = null;
			}

			tool = "select";
			mouseCursor.shape = "cross";
			draw();
		}
		else if (newTool == "modify")
		{
			if (tool != "modify")
			{
				mode = null;
			}

			tool = "modify";
			mouseCursor.shape = "angle";
			draw();
		}
	}

	function onKeyDown(evt)
	{
		if (evt.keyCode==27)
		{
			if (mode == "move")
			{
				if (tool == "select")
				{
		    		for (var i = 0; i < selectionList.length; ++i)
		    		{
		    			if (selectionList[i].getOrigin !== undefined)
		    			{
		    				selectionList[i].setOrigin(add(dragStartMousePos, moveOffsets[i]));
		    			}
		    		}
				}
			}

			if (mode=="move" || mode=="selection" || mode=="marquee")
			{
				mode = null;
			}
			else
			{
				setSelection([]);
			}

			draw();
		}
		else if (evt.keyCode==81) // q
		{
			setTool("select");
		}
		else if (evt.keyCode==86) // v
		{
			setTool("modify");
		}
		else if (evt.keyCode==46) // del
		{
			scene.deleteObjects(selectionList);
			setSelection([]);
			draw();
		}
	}
	
	function onMouseDown(evt)
	{
		lastMousePos = camera.getMousePos(evt);
		lastMousePosPixels = getMousePos(evt, canvas);
		
		dragStartMousePos.x	= lastMousePos.x;
		dragStartMousePos.y	= lastMousePos.y;
		dragStartMousePosPixels.x = lastMousePosPixels.x;
		dragStartMousePosPixels.y = lastMousePosPixels.y;
		dragStartCamPos.x = camera.getViewPosition().x;
		dragStartCamPos.y = camera.getViewPosition().y;

		if (evt.buttons & 1)
		{
			var threshold = 10 / camera.getUnitScale();

			if (tool == "select")
			{
				var s = scene.hitTest(sub(lastMousePos, threshold), add(lastMousePos, threshold));

				if (s.length == 0)
				{
					mode = "marquee";
				}
				else
				{
		    		mode = "selection";

					if (evt.altKey == 0)
					{
						var snapPoint = scene.getSnapPoint(lastMousePos, camera.invScale(30));

						if (snapPoint !== null)
						{
							dragStartMousePos = snapPoint;
						}
						else
						{
							dragStartMousePos = mul(round(div(dragStartMousePos, grid.spacing)), grid.spacing);
						}
					}

		    		if (selectionList.indexOf(s[0])==-1 && evt.ctrlKey==0)
					{
						setSelection(s);
		    		}

		    		moveOffsets = [];

		    		for (var i = 0; i < selectionList.length; ++i)
		    		{
		    			if (selectionList[i].getOrigin !== undefined)
						{
		    				moveOffsets.push(sub(selectionList[i].getOrigin(), dragStartMousePos));
		    			}
		    			else
		    			{
							moveOffsets.push(undefined);
		    			}
		    		}
				}
			}
			else if (tool == "modify")
			{
				dragPoint = scene.getDragPoint(lastMousePos, camera.invScale(30), evt.ctrlKey);

				mode = null;

				if (dragPoint.point !== null)
				{
					mode = "move";
					dragStartMousePos = dragPoint.point;
				}
			}
        }
	}

	function onMouseUp(evt)
	{
		lastMousePos = camera.getMousePos(evt);
		lastMousePosPixels = getMousePos(evt, canvas);
		
		if (evt.button == 0) // object move or marquee
		{
			if (tool == "select")
			{
				if (mode == "marquee" || mode == "selection") // marquee
				{
					var threshold = 10 / camera.getUnitScale();

					var s = [];

					if ((sub(dragStartMousePos, lastMousePos)).length() < threshold)
					{
						s = scene.hitTest(sub(lastMousePos, threshold), add(lastMousePos, threshold));
					}
					else
					{
						var pMin = new Vector(Math.min(dragStartMousePos.x, lastMousePos.x), Math.min(dragStartMousePos.y, lastMousePos.y));
						var pMax = new Vector(Math.max(dragStartMousePos.x, lastMousePos.x), Math.max(dragStartMousePos.y, lastMousePos.y));

						pMin = sub(pMin, threshold);
						pMax = add(pMax, threshold);

						s = scene.hitTest(pMin, pMax);
					}
				
					if (evt.ctrlKey)
					{
						s = selectionList.concat(s);
					}
					else if (evt.shiftKey)
					{
						var copy = selectionList.concat([]);

						for (var i = 0; i < copy.length; ++i)
						{
							for (var j = 0; j < s.length; ++j)
							{
								index = copy.indexOf(s[j]);

								if (index >= 0)
								{
									copy.splice(index, 1);
									break;
								}
							}
						}

						s = copy;
					}

					setSelection(s);
				}
				//else if (mode == "selection")
				//{
				//	var threshold = 10 / camera.getUnitScale();
				//	var s = scene.hitTest(sub(lastMousePos, threshold), add(lastMousePos, threshold));

				//	if (evt.ctrlKey)
				//	{
				//		s = selectionList.concat(s);
				//	}
				//	else if (evt.shiftKey)
				//	{

				//	setSelection(s);
				//}

				mode = null;
			}
			else if (tool == "modify")
			{
				mode = null;
			}
		}
	}

	function onMouseMove(evt)
	{
		draw();
		

		lastMousePos = camera.getMousePos(evt);
		lastMousePosPixels = getMousePos(evt, canvas);

		mouseCursor.pos = camera.getMousePos(evt);
	
		if (evt.buttons == 0)
		{
			if (tool == "select")
			{
				var snapPoint = scene.getSnapPoint(lastMousePos, camera.invScale(30));

				if (snapPoint !== null)
				{
					camera.drawRectangle(snapPoint, camera.invScale(10), "#0084e0", 2);
				}
			}
			else if (tool == "modify")
			{
				var newDragPoint = scene.getDragPoint(lastMousePos, camera.invScale(30), evt.ctrlKey);

				if (newDragPoint.point !== null)
				{
					if (newDragPoint.object.drawDragPoint !== undefined)
					{
						newDragPoint.object.drawDragPoint(camera, newDragPoint.index, evt.ctrlKey);
					}
					else
					{
						camera.drawRectangle(newDragPoint.point, camera.invScale(10), "#ff0000", 2);
					}
				}
			}
		}
		else if (evt.buttons & 1) // object move or marquee
		{
			if (mode == "move")
			{
				if (evt.altKey == 0)
				{
					var ignoreList;

					if (tool == "select")
						ignoreList = selectionList.concat([]);
					else
						ignoreList = [dragPoint.object];

					var snapPoint = scene.getSnapPoint(lastMousePos, camera.invScale(30), ignoreList);

					if (snapPoint !== null)
					{
						camera.drawRectangle(snapPoint, camera.invScale(10), "#0084e0", 2);
						lastMousePos = snapPoint;
					}
					else
					{
						lastMousePos = mul(round(div(lastMousePos, grid.spacing)), grid.spacing);
					}
				}

				if (evt.ctrlKey && tool == "select")
				{
					var delta = sub(lastMousePos, dragStartMousePos);
					var absDelta = abs(delta);

					if (absDelta.x > absDelta.y)
					{
						lastMousePos.y = dragStartMousePos.y;
					}
					else
					{
						lastMousePos.x = dragStartMousePos.x;
					}
				}
			}

			if (tool == "select")
			{
				if (mode == "marquee") // marquee
				{
					camera.drawRectangle(dragStartMousePos, lastMousePos, "#000000", 1, [5,5]);
				}
				else if (mode == "selection" || mode == "move" ) // object move
				{
					mode = "move";
				
		    		for (var i = 0; i < selectionList.length; ++i)
		    		{
		    			if (selectionList[i].getOrigin !== undefined)
		    			{
		    				selectionList[i].setOrigin(add(lastMousePos, moveOffsets[i]));
		    			}
					}
				}
			}
			else if (tool == "modify")
			{
				if (mode === "move")
				{
					dragPoint.object.setDragPointPos(dragPoint.index, lastMousePos, evt.ctrlKey);
				}
			}
		}
		else if (evt.buttons & 4) // camera pan
		{
			var delta = div(sub(lastMousePosPixels, dragStartMousePosPixels), new Vector(-camera.getUnitScale(), camera.getUnitScale()));
			var P = add(dragStartCamPos, delta);
			camera.setViewPosition(P.x, P.y);
		}
	}

	function onMouseWheel(evt)
	{
		lastMousePosPixels = camera.getMousePos(evt);

		var zoomCenter = lastMousePosPixels;

		var zoomFactor = 1.0 + Math.sign(evt.deltaY) * 0.1;

		var minX = camera.getViewPosition().x - camera.getViewSize().x/2;
		var maxX = camera.getViewPosition().x + camera.getViewSize().x/2;
		var minY = camera.getViewPosition().y - camera.getViewSize().y/2;
		var maxY = camera.getViewPosition().y + camera.getViewSize().y/2;
		
		minX = zoomCenter.x - (zoomCenter.x - minX) * zoomFactor;
		maxX = zoomCenter.x + (maxX-zoomCenter.x) * zoomFactor;

		minY = zoomCenter.y - (zoomCenter.y - minY) * zoomFactor;
		maxY = zoomCenter.y + (maxY-zoomCenter.y) * zoomFactor;

		camera.setViewPosition((minX+maxX)/2, (minY+maxY)/2);
		camera.setUnitScale( camera.getUnitScale() / zoomFactor);
		draw();
		
		return false;
	}

	function setSelection(s)
	{
		for (var i=0; i<selectionList.length; ++i)
		{
			if (selectionList[i].selected !== undefined)
			{
				selectionList[i].selected = false;
			}
		}
	
		selectionList = s;
		
		for (var i=0; i<selectionList.length; ++i)
		{
			if (selectionList[i].selected !== undefined)
			{
				selectionList[i].selected = true;
			}
		}

		if (selectionList.length > 0)
		{
			propertyGrid.setProperties(selectionList[0].getProperties());
		}
		else
		{
			propertyGrid.setProperties([]);
		}

		draw();
	}
	
	function draw()
	{
		scene.draw(camera);
	}
	
	setup();
	draw();
}
