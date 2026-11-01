extends Node3D
var game
var weapon: Dictionary
var velocity: Vector3
var age := 0.0

func setup(session, definition: Dictionary, direction: Vector3):
 game = session
 weapon = definition
 velocity = direction * float(definition.ProjectileSpeed)
 var visual := MeshInstance3D.new()
 var sphere := SphereMesh.new()
 sphere.radius = 0.1
 sphere.height = 0.2
 visual.mesh = sphere
 visual.material_override = game.material(Color(1, 0.6, 0.1), true)
 add_child(visual)

func _physics_process(delta):
 if game.mode != "playing": return
 age += delta
 velocity += Vector3.DOWN * 9.8 * delta
 var target: Vector3 = global_position + velocity * delta
 var query := PhysicsRayQueryParameters3D.create(global_position, target)
 query.exclude = [game.player.get_rid()]
 var hit := get_world_3d().direct_space_state.intersect_ray(query)
 if hit or age > 5:
  var center: Vector3 = hit.position if hit else global_position
  for enemy in game.enemies.duplicate():
   if is_instance_valid(enemy):
    var distance: float = enemy.global_position.distance_to(center)
    if distance < weapon.BlastRadius:
     enemy.damage(float(weapon.Damage) * (1.0 - 0.7 * distance / float(weapon.BlastRadius)), enemy.global_position)
  queue_free()
 else: global_position = target
