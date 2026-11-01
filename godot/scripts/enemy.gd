extends CharacterBody3D

var game
var health := 90.0
var cooldown := 2.0
var suppressed := 0.0
var sensor: MeshInstance3D

func setup(session, index):
 game = session
 health = 200.0 if index == 0 and game.chapter_index >= 3 else 90.0
 var collision := CollisionShape3D.new()
 var shape := CapsuleShape3D.new()
 shape.radius = 0.4
 shape.height = 1.8
 collision.shape = shape
 collision.position.y = 0.9
 add_child(collision)
 var body := MeshInstance3D.new()
 var mesh := CapsuleMesh.new()
 mesh.radius = 0.38
 mesh.height = 1.8
 body.mesh = mesh
 body.position.y = 0.9
 body.material_override = game.material(Color(0.33, 0.29, 0.26))
 add_child(body)
 sensor = MeshInstance3D.new()
 var sphere := SphereMesh.new()
 sphere.radius = 0.18
 sphere.height = 0.36
 sensor.mesh = sphere
 sensor.position = Vector3(0, 1.5, -0.35)
 sensor.material_override = game.material(Color(1, 0.2, 0.08), true)
 add_child(sensor)

func _physics_process(delta):
 if game.mode != "playing": return
 if suppressed > 0:
  suppressed -= delta
  return
 var offset: Vector3 = game.player.global_position - global_position
 offset.y = 0
 if offset.length_squared() > 0.1: look_at(global_position + offset, Vector3.UP)
 if offset.length() > 11:
  var direction := offset.normalized()
  velocity.x = direction.x * 2.0
  velocity.z = direction.z * 2.0
 else:
  velocity.x = 0
  velocity.z = 0
 velocity.y = -2
 move_and_slide()
 cooldown -= delta
 if cooldown <= 0 and offset.length() < 30:
  var from := global_position + Vector3.UP * 1.4
  var target: Vector3 = game.player.global_position + Vector3.UP * 1.1
  var query := PhysicsRayQueryParameters3D.create(from, target)
  query.exclude = [get_rid()]
  var hit := get_world_3d().direct_space_state.intersect_ray(query)
  if hit and hit.collider == game.player:
   game.player.damage(8)
  cooldown = 1.8

func damage(amount, point):
 health -= amount * (3.0 if point.y > global_position.y + 1.35 else 1.0)
 if health <= 0:
  game.enemy_defeated(self)
  queue_free()
