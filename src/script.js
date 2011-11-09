Tile = new Class({
    initialize: function(x,y,type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.isVisited = false;
        this.distance = 10000;
        this.origin = null;
    },
    updateTile: function(targetTile) {
        if(targetTile.isVisited) return;
        
        var distance = this.distance + targetTile.type.Weight;
        if(distance < targetTile.distance) {
            targetTile.distance = distance;
            targetTile.origin = this;
        }
    },
    toString: function() {
        return 'Tile {' + this.x + ',' + this.y + '} [' + this.type + ']';
    }
});

var TileType = {
    Entry: { 
        Color: '#8ae234',
        Weight: 1,
        IsBlocking: false
    },
    Exit: { 
        Color: '#ef2929',
        Weight: 1,
        IsBlocking: false
    },
    Free: { 
        Color: '#edd400',
        Weight: 1,
        IsBlocking: false
    },
    Wall: { 
        Color: '#8f5902',
        Weight: 10000,
        IsBlocking: true
    }
};

TileMap = new Class({
    initialize: function(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.path = null;
        
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
                
                if(this.path != null && this.path.contains(tile))
                    context.fillStyle = '#fce94f';
                else
                    context.fillStyle = tile.type.Color;
                    
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
    computePath: function() {
        // Reset tiles
        this.tiles.each(function(item, index) {
            if(item.type === TileType.Entry) {
                item.distance = 0;
                item.isVisited = false;
            } else {
                item.distance = 999999999;
                item.isVisited = false;
            }
        });
        
        var current = this.getEntry();
        var entry = current;
        var exit = this.getExit();
        
        // Compute distances
        do {
            current.isVisited = true;
            this.updateConnectedTiles(current);
            current = this.getNextTile();
        } while (current != exit)
        
        // Reverse path
        var list = new LinkedList();
        while(current != entry) {
            list.addFirst(new Node(current));
            current = current.origin;
        }
        
        return list;
    },
    updatePath: function() {
        this.path = this.computePath();
    },
    updateConnectedTiles: function(tile) {
        if(tile.y > 0)                  tile.updateTile(this.getTile(tile.x, tile.y-1));
        if(tile.y < this.height - 1)    tile.updateTile(this.getTile(tile.x, tile.y+1));
        if(tile.x > 0)                  tile.updateTile(this.getTile(tile.x-1, tile.y));
        if(tile.x < this.width - 1)     tile.updateTile(this.getTile(tile.x+1, tile.y));
    },
    getNextTile: function() {
        var nextTile;
        
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
    randomizeBlockingTiles: function() {        
        this.tiles.each(function(item, index) {
            if(item.type === TileType.Entry || item.type === TileType.Exit) return;
        
            var random = Math.random();
            
            if(random < 0.4) {
                item.type = TileType.Wall;
                
                if((this.isBlockedLeft(item) && this.isBlockedRight(item))
                    || (this.isBlockedTop(item) && this.isBlockedBottom(item)))
                {
                    console.trace("Reverting wall tile to prevent path blocking");
                    item.type = TileType.Free;
                }
            }
        }, this);
    },
    isBlockedLeft: function(tile) {
        if(!tile.type.IsBlocking) return false;
        if(tile.x == 0) return true;
        
        var blocking = false;
        
        blocking |= this.isBlockedLeft(this.getTile(tile.x-1, tile.y));
        if(tile.y > 0) blocking |= this.isBlockedLeft(this.getTile(tile.x-1, tile.y-1));
        if(tile.y < this.height - 1) blocking |= this.isBlockedLeft(this.getTile(tile.x-1, tile.y+1));
        
        return blocking;
    },
    isBlockedRight: function(tile) {
        if(!tile.type.IsBlocking) return false;
        if(tile.x == this.width - 1) return true;
        
        var blocking = false;
        
        blocking |= this.isBlockedRight(this.getTile(tile.x+1, tile.y));
        if(tile.y > 0) blocking |= this.isBlockedRight(this.getTile(tile.x+1, tile.y-1));
        if(tile.y < this.height - 1) blocking |= this.isBlockedRight(this.getTile(tile.x+1, tile.y+1));
        
        return blocking;
    },
    isBlockedTop: function(tile) {
        if(!tile.type.IsBlocking) return false;
        if(tile.y == 0) return true;
        
        var blocking = false;
        
        blocking |= this.isBlockedTop(this.getTile(tile.x, tile.y-1));
        if(tile.x > 0) blocking |= this.isBlockedTop(this.getTile(tile.x-1, tile.y-1));
        if(tile.x < this.width - 1) blocking |= this.isBlockedTop(this.getTile(tile.x+1, tile.y-1));
        
        return blocking;
    },
    isBlockedBottom: function(tile) {
        if(!tile.type.IsBlocking) return false;
        if(tile.y == this.height - 1) return true;
        
        var blocking = false;
        
        blocking |= this.isBlockedBottom(this.getTile(tile.x, tile.y+1));
        if(tile.x > 0) blocking |= this.isBlockedBottom(this.getTile(tile.x-1, tile.y+1));
        if(tile.x < this.width - 1) blocking |= this.isBlockedBottom(this.getTile(tile.x+1, tile.y+1));
        
        return blocking;
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
    addFirst: function(node) {
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
    addLast: function(node) {
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
        this.context = canvas.getContext("2d");
    },
    update: function(tick) {
        
    },
    draw: function() {
        // Draw tiles
        this.tileMap.draw(this.context, 0, 0);
    }
});

function startGame() {
    var theGame = new Game(document.getElementById('canvas'));
    theGame.tileMap.setEntry(6,2);
    theGame.tileMap.setExit(34,26);
    theGame.tileMap.randomizeBlockingTiles();
    theGame.tileMap.updatePath();
    theGame.draw();
}