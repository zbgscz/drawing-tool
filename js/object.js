function point(x,y){
	this.x=x;
	this.y=y;
}

function object(type, var1, var2){
	this.type=type;
	if(type=='rectangle'||type=='line'){
		//in this case var1 is startpoint and var2 is endpoint
		this.startpoint=new point(var1.x,var1.y);
		this.endpoint=new point(var2.x,var2.y);
	}
	else if(type=='freeline'){
		//in this case var1 is the points array
		this.points=var1;
	}
	else{
		//in this case var1 is center point and v2 is r
		this.center=new point(var1.x,var1.y);
		this.r=var2;		
	}
}

function block(startpoint, endpoint, obj, flag){
	this.deleted=new Boolean(flag);
	this.startpoint=new point(startpoint.x,startpoint.y);
	this.endpoint=new point(endpoint.x,endpoint.y);
	this.obj=JSON.parse(JSON.stringify(obj));
	this.flag=flag;
}

function editEvent(type, blkind, sptr, eptr){
	this.type=type;
	this.ind=blkind;
	if(this.type=='draw'){
		//do nothing
	}
	else if(this.type=='move'){
		this.startpoint=new point(sptr.x,sptr.y);
		this.endpoint=new point(eptr.x,eptr.y);
	}
	else{
		//if delete
		this.startpoint=new point(sptr.x,sptr.y);
	}
}