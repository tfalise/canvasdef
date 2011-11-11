var MAX_DISTANCE = 10000;
var WALL_SPAWN_RATE = 0.3;

Tile = new Class({
    initialize: function(x,y,type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.isVisited = false;
        this.distance = MAX_DISTANCE;
        this.ancestors = [];
        this.next = null;
    },
    removeAncestor: function(tile) {
        var idx = this.ancestors.indexOf(tile);
        if(idx != -1) this.ancestors.splice(idx, 1);
    },
    updateNeighbour: function(target) {
        if(target.isVisited) return;
        
        var distance = this.distance + target.type.Weight;
        if(distance < target.distance) {
            // Update target distance
            target.distance = distance;
            
            // If the target already had a path, remove it
            if(target.next != null) {
                target.next.removeAncestor(target);
            }
            
            // Update new path
            this.ancestors.push(target);
            target.next = this;
        }
    },
    toString: function() {
        return 'Tile {' + this.x + ',' + this.y + '} [' + this.type + ']';
    }
});

var TileType = {
    Entry: { 
        Name: 'Entry',
        Color: '#8ae234',
        Weight: 1,
        IsBlocking: false
    },
    Exit: { 
        Name: 'Exit',
        Color: '#ef2929',
        Weight: 0,
        IsBlocking: false
    },
    Free: { 
        Name: 'Free',
        Color: '#edd400',
        Weight: 1,
        IsBlocking: false
    },
    Wall: { 
        Name: 'Wall',
        Color: '#8f5902',
        Weight: MAX_DISTANCE,
        IsBlocking: true
    }
};

TileMap = new Class({
    initialize: function(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.path = null;
        this.pathOrigin = null;
        
        // Create tiles
        for(h = 0; h < this.height; h++) {
            for(w = 0; w < this.width; w++) {
                this.tiles[h*this.width + w] = new Tile(w, h, TileType.Free);
            }
        }
    },
    getTile: function(x,y) {
        return this.tiles[y*this.width + x];
    },
    draw: function(context, refX, refY) {
        for(h = 0; h < this.height; h++) {
            for(w = 0; w < this.width; w++) {
                var tile = this.getTile(w,h);
                
                if(this.pathOrigin == tile && tile.type != TileType.Entry) {
                    context.fillStyle = '#729fcf';
                } else if(this.path != null && this.path.contains(tile) && tile.type != TileType.Entry) {
                    context.fillStyle = '#fce94f';
                } else {
                    context.fillStyle = tile.type.Color;
                }
                    
                context.fillRect(refX + w*10, refY + h*10, 10, 10);
            }
        }
    },
    setEntry: function(x,y) {
        this.setTileType(x,y,TileType.Entry);
    },
    getEntry: function() {
        return this.tiles.filter(function(item, index) { return item.type === TileType.Entry; })[0];
    },
    setExit: function(x,y) {
        this.setTileType(x,y,TileType.Exit);
    },
    getExit: function() {
        return this.tiles.filter(function(item, index) { return item.type === TileType.Exit; })[0];
    },
    setTileType: function(x,y,newType) {
        var tile = this.getTile(x,y);
        tile.type = newType;
    },
    setPathOrigin: function(tile) {
        this.pathOrigin = tile;
        this.path = this.getPath(tile);
    },
    randomizeWalls: function() {     
        do {
            this.clearWalls();
        
            this.tiles.each(function(item, index) {
                if(item.type === TileType.Entry || item.type === TileType.Exit) return;
            
                var random = Math.random();
                
                if(random < WALL_SPAWN_RATE) {
                    item.type = TileType.Wall;
                }
            }, this);
            
            this.updateTiles();
        } while(this.getEntry().next == null);
        
        this.fillDeadEnds();
    },
    updateTiles: function() {
        var current = this.getUpdatableTile();
        
        while(current != null) {
            // Flag the tile as visited
            current.isVisited = true;
            this.updateTileNeighbours(current);
            current = this.getUpdatableTile();
        }
    },
    updateTileNeighbours: function(tile) {
        if(tile.y > 0)                  tile.updateNeighbour(this.getTile(tile.x, tile.y-1));
        if(tile.y < this.height - 1)    tile.updateNeighbour(this.getTile(tile.x, tile.y+1));
        if(tile.x > 0)                  tile.updateNeighbour(this.getTile(tile.x-1, tile.y));
        if(tile.x < this.width - 1)     tile.updateNeighbour(this.getTile(tile.x+1, tile.y));
    },
    getUpdatableTile: function() {
        // Always start from the exit if not visited
        var theExit = this.getExit();
        if(!theExit.isVisited) {
            theExit.distance = 0;
            return theExit;
        }
        
        // Find the unvisited tile having the lowest distance
        var nextTile = null;
        this.tiles.each(function(item, index) {
            if(!item.isVisited) {
                if(nextTile == null) {
                    nextTile = item;
                }
                
                if(item.distance < nextTile.distance) {
                    nextTile = item;
                }
            }
        });
        
        return nextTile;
    },
    addWall: function(tile) {
        // Cannot turn entry & exit into walls
        if(tile.type == TileType.Entry || tile.type == TileType.Exit) return;
        
        tile.type = TileType.Wall;
        
        // TODO: add algorithm to invalidate orphan tiles
        
        // Recompute pathes
        this.updateTiles();
        
        // Update path if needed
        if(this.path != null && this.path.contains(tile)) {
            this.path = this.getPath(this.pathOrigin);
        }
    },
    getPath: function(tile) {
        var path = new LinkedList();
        var current = tile;
        
        while(tile != null) {
            path.addLast(tile);
            tile = tile.next;
        }
        
        return path;
    },
    fillDeadEnds: function() {
        this.tiles.each(function(item, index) {
            if(item.next == null && item.type == TileType.Free) item.type = TileType.Wall;
        });
    },
    clearWalls: function() {
        this.tiles.each(function(item, index) {
            item.isVisited = false;
            item.ancestors = [];
            item.next = null;
            
            if(item.type == TileType.Exit) {
                item.distance = 0;
            } else {
                item.distance = MAX_DISTANCE;
            }
            
            if(item.type == TileType.Wall) {
                item.type = TileType.Free;
            }
        });
    }
});

Node = new Class({
    initialize: function(value) {
        this.next = null;
        this.previous = null;
        this.value = value;
    }
});

LinkedList = new Class({
    initialize: function() {
        this.head = null;
        this.tail = null;
    },
    addFirst: function(value) {
        var node = new Node(value);
        
        if(this.head == null) {
            this.head = node;
            this.tail = node;
            return;
        }
        
        this.head.previous = node;
        node.previous = null;
        node.next = this.head;
        this.head = node;
    },
    addLast: function(value) {
        var node = new Node(value);
        
        if(this.head == null) {
            this.head = node;
            this.tail = node;
            return;
        }
    
        var current = this.head;
        while(current.next != null) {
            current = current.next;
        }
        
        node.previous = current;
        current.next = node;
        this.tail = node;
    },
    contains: function(value) {
        var current = this.head;
        while(current.next != null) {
            if(current.value === value) return true;
            current = current.next;
        }
        
        return false;
    }
});

Game = new Class({
    initialize: function(canvas) {
        this.tileMap = new TileMap(40,30);
        this.canvas = canvas;
        this.canvas.game = this;
        this.context = canvas.getContext("2d");
        this.canvas.addEventListener('click', this.onClicked, true);
    },
    update: function(tick) {
        
    },
    onClicked: function(e) {
        // find the clicked tile
        var x = Math.floor((e.pageX - this.offsetLeft) / 10);
        var y = Math.floor((e.pageY - this.offsetTop) / 10);

        // dont try to get a path for tiles out of bounds
        if(x >= this.game.tileMap.width || y >= this.game.tileMap.height) return;
        
        if(e.ctrlKey) {
            //this.game.tileMap.addWall(theGame.tileMap.getTile(x,y));
        } else {
            this.game.tileMap.setPathOrigin(theGame.tileMap.getTile(x,y));
        }
        
        this.game.draw();
    },
    draw: function() {
        // Draw tiles
        this.tileMap.draw(this.context, 0, 0);
    }
});

function startGame() {
    theGame = new Game(document.getElementById('canvas'));
    theGame.tileMap.setEntry(6,2);
    theGame.tileMap.setExit(34,26);
    theGame.tileMap.randomizeWalls();
    theGame.tileMap.setPathOrigin(theGame.tileMap.getEntry());
    theGame.draw();
}
