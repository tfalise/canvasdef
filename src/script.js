// Constants & Enum definitions 
var Constants = {
    MaximumDistance     : 10000,
    WallSpawnRate       : 0.3,
    GameFPS             : 40,
    MonsterBaseSpeed    : 0.5,
    Debug               : false
};

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
        Weight: Constants.MaximumDistance,
        IsBlocking: true
    }
};

// Framework enhancements
Array.prototype.remove = function(item) {
    var itemIdx = this.indexOf(item);
    if(itemIdx != -1) this.splice(itemIdx, 1);
};

// Classes definitions
Tile = new Class({
    initialize: function(x,y,type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.isVisited = false;
        this.distance = Constants.MaximumDistance;
        this.ancestors = [];
        this.next = null;
        this.wasUpdated = false;
    },
    updateNeighbour: function(target) {
        if(target.isVisited) return;
        
        var distance = this.distance + target.type.Weight;
        if(distance < target.distance) {
            // Update target distance
            target.distance = distance;
            
            // If the target already had a path, remove it
            if(target.next != null) {
                target.next.ancestors.remove(target);
            }
            
            // Update new path
            this.ancestors.push(target);
            target.next = this;
        }
    },
    getCenter: function() {
        return new Vector2(this.x * 10 + 5, this.y * 10 + 5);
    },
    getNeighbours: function(map) {
        var neighbours = [];
        
        if(this.y > 0)                  neighbours.push(map.getTile(this.x, this.y-1));
        if(this.y < map.height - 1)     neighbours.push(map.getTile(this.x, this.y+1));
        if(this.x > 0)                  neighbours.push(map.getTile(this.x-1, this.y));
        if(this.x < map.width - 1)      neighbours.push(map.getTile(this.x+1, this.y));
        
        return neighbours;
    },
    toString: function() {
        return 'Tile {' + this.x + ',' + this.y + '} [' + this.type + ']';
    }
});

TileMap = new Class({
    initialize: function(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = [];
        this.path = null;
        this.pathOrigin = null;
        this.monsters = [];
        
        // Create tiles
        for(h = 0; h < this.height; h++) {
            for(w = 0; w < this.width; w++) {
                this.tiles[h*this.width + w] = new Tile(w, h, TileType.Free);
            }
        }
    },
    update: function() {
        this.monsters.each(function(item, index) {
            item.update();
        });
    },
    getTile: function(x,y) {
        return this.tiles[y*this.width + x];
    },
    draw: function(context, refX, refY) {
        for(h = 0; h < this.height; h++) {
            for(w = 0; w < this.width; w++) {
                var tile = this.getTile(w,h);
                
                if(this.pathOrigin == tile && tile.type == TileType.Free) {
                    context.fillStyle = '#729fcf';
                } else if(this.path != null && this.path.contains(tile) && tile.type != TileType.Entry) {
                    context.fillStyle = '#fce94f';
                } else if (tile.wasUpdated && tile.type == TileType.Free) {
                    context.fillStyle = '#ad7fa8';
                }  else {
                    context.fillStyle = tile.type.Color;
                }
                    
                context.fillRect(refX + w*10, refY + h*10, 10, 10);
            }
        }
        
        this.monsters.each(function(item, index) {
            item.draw(context);
        });
        
        if(Constants.Debug) this.resetUpdateStatus();
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
                
                if(random < Constants.WallSpawnRate) {
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
        tile.getNeighbours(this).each(function(item, index) {
            tile.updateNeighbour(item);
        });
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
        
        // Set tile to wall
        tile.type = TileType.Wall;
        tile.next = null;
        
        // Reset tile
        this.resetTile(tile);
        
        // Recompute pathes
        this.updateTiles();
        
        // Update path if needed
        if(this.path != null && this.path.contains(tile)) {
            this.path = this.getPath(this.pathOrigin);
        }
    },
    resetTile: function(tile) {
        tile.next = null;
        tile.distance = Constants.MaximumDistance;
        if(Constants.Debug) tile.wasUpdated = true;
        
        // Mark neighbours as unvisited
        tile.getNeighbours(this).each(function(item, index) {
            if(item.type != TileType.Wall)
                item.isVisited = false;
        });
        
        // TODO: there might be an optimization available here, based on which ancestors must be reset
        
        // Reset ancestors
        tile.ancestors.each(function(item, index) {
            this.resetTile(item);
        }, this);
        
        tile.ancestors = [];
    },
    resetUpdateStatus: function() {
        this.tiles.each(function(item, index) {
            item.wasUpdated = false;
        });
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
                item.distance = Constants.MaximumDistance;
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

Vector2 = new Class({
    initialize: function(x,y) {
        this.x = x;
        this.y = y;
    },
    invert: function() {
        this.x = -this.x;
        this.y = -this.y;
    }
});

Monster = new Class({
    initialize: function(map, x, y) {
        this.position = new Vector2(x,y);
        this.direction = new Vector2(0,0);
        this.speed = Constants.MonsterBaseSpeed;
        this.map = map;
        this.nextTile = null;
        this.color = '#2e3436';
        
        this.updateNextTile();
    },
    update: function() {
        // If the next tile has been made a wall, revert direction
        if(this.nextTile.type == TileType.Wall) {
            this.direction.invert();
            this.nextTile = this.getCurrentTile(); // revert should only happen when the monster is fully on the first tile
        }
    
        // Update position
        this.position.x += this.direction.x * this.speed;
        this.position.y += this.direction.y * this.speed;
        
        // If we currently are on the target tile, check the position to see if we need to change it
        var currentTile = this.getCurrentTile();
        if(this.getCurrentTile() == this.nextTile) {            
            var hasReachedCenter = this.checkPositionToCenter(currentTile.getCenter());
            
            // If we reached the exit, remove the monster
            if(this.nextTile == this.map.getExit()) {
                this.map.monsters.remove(this);
                this.map = null;
                return;
            }
            
            if(hasReachedCenter) {
                this.updateNextTile();
            }
        }
        
    },
    checkPositionToCenter: function(vector) {
        if(this.direction.x ==  1 && this.position.x >= vector.x) { this.position.x = vector.x; return true; }
        if(this.direction.x == -1 && this.position.x <= vector.x) { this.position.x = vector.x; return true; }
        if(this.direction.y ==  1 && this.position.y >= vector.y) { this.position.y = vector.y; return true; }
        if(this.direction.y == -1 && this.position.y <= vector.y) { this.position.y = vector.y; return true; }
        
        return false;
    },
    updateNextTile: function() {
        this.nextTile = this.getCurrentTile().next;
        this.direction = this.getNextDirection();
    },
    getNextDirection: function() {
        var current = this.getCurrentTile();
        
        if(this.nextTile.x < current.x) return new Vector2(-1, 0);
        if(this.nextTile.x > current.x) return new Vector2(1, 0);
        if(this.nextTile.y > current.y) return new Vector2(0, 1);
        if(this.nextTile.y < current.y) return new Vector2(0, -1);
    },
    getCurrentTile: function() {
        return this.map.getTile(Math.floor(this.position.x / 10), Math.floor(this.position.y / 10));
    },
    draw: function(context) {
        context.fillStyle = this.color;
        context.beginPath();
        context.arc(this.position.x, this.position.y, 4, 0, Math.PI*2, true);
        context.closePath();
        context.fill();
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
    update: function() {
        this.tileMap.update();
    },
    onClicked: function(e) {
        // find the clicked tile
        var x = Math.floor((e.pageX - this.offsetLeft) / 10);
        var y = Math.floor((e.pageY - this.offsetTop) / 10);

        // dont try to get a path for tiles out of bounds
        if(x >= this.game.tileMap.width || y >= this.game.tileMap.height) return;
        
        if(e.ctrlKey) {
            this.game.tileMap.addWall(theGame.tileMap.getTile(x,y));
        } else {
            this.game.tileMap.setPathOrigin(theGame.tileMap.getTile(x,y));
        }
        
        this.game.draw();
    },
    draw: function() {
        // Draw tiles
        this.tileMap.draw(this.context, 0, 0);
    },
    initializeLevel: function() {
        this.tileMap.setEntry(6,2);
        this.tileMap.setExit(34,26);
        this.tileMap.randomizeWalls();
        this.tileMap.setPathOrigin(theGame.tileMap.getEntry());
    },
    run: function() {
        this.update();
        this.draw();
    },
    spawnMonster: function() {
        var startPosition = this.tileMap.getEntry().getCenter();
        var monster = new Monster(this.tileMap, startPosition.x, startPosition.y);
        
        this.tileMap.monsters.push(monster);
    }
});

// Game control
function startGame() {
    theGame = new Game(document.getElementById('canvas'));
    theGame.initializeLevel();
    runGame();
}

function runGame() {
    theGame._intervalId = theGame.run.periodical(1000 / Constants.GameFPS, theGame);
}

function stopGame() {
    clearInterval(theGame._intervalId);
}

function spawn() {
    theGame.spawnMonster();
}