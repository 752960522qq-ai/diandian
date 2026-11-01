extends CharacterBody3D

var game
var pivot: Node3D
var camera: Camera3D
var pitch := -0.12
var health := 120.0
var crouched := false
var body_shape: CollisionShape3D
var body_visual: MeshInstance3D

func setup(session):
 game = session
 var shape := CollisionShape3D.new()
 var capsule := CapsuleShape3D.new()
 capsule.radius = 0.32
 capsule.height = 1.8
 shape.shape = capsule
 shape.position.y = 0.9
 add_child(shape)
 body_shape = shape
 var visual := MeshInstance3D.new()
 var mesh := CapsuleMesh.new()
 mesh.radius = 0.30
 mesh.height = 1.8
 visual.mesh = mesh
 visual.position.y = 0.9
 visual.material_override = game.material(Color(0.3, 0.38, 0.3))
 add_child(visual)
 body_visual = visual
 pivot = Node3D.new()
 pivot.position = Vector3(0, 1.5, 0)
 add_child(pivot)
 camera = Camera3D.new()
 camera.position = Vector3(0.6, 0.2, 3.8)
 camera.current = true
 pivot.add_child(camera)

func _unhandled_input(event):
 if game.mode != "playing": return
 if event is InputEventMouseMotion:
  rotation.y -= event.relative.x * 0.002
  pitch = clamp(pitch - event.relative.y * 0.002, -1.0, 0.55)
  pivot.rotation.x = pitch

func _physics_process(delta):
 if game.mode != "playing": return
 var input := Vector2(float(Input.is_key_pressed(KEY_D)) - float(Input.is_key_pressed(KEY_A)), float(Input.is_key_pressed(KEY_S)) - float(Input.is_key_pressed(KEY_W)))
 input = input.limit_length()
 crouched = Input.is_key_pressed(KEY_CTRL)
 body_shape.scale.y = 0.67 if crouched else 1.0
 body_shape.position.y = 0.6 if crouched else 0.9
 body_visual.scale.y = 0.67 if crouched else 1.0
 body_visual.position.y = 0.6 if crouched else 0.9
 pivot.position.y = 1.0 if crouched else 1.5
 var speed := 2.2 if crouched else (6.2 if Input.is_key_pressed(KEY_SHIFT) else 4.2)
 var direction := global_basis * Vector3(input.x, 0, input.y)
 velocity.x = direction.x * speed
 velocity.z = direction.z * speed
 if not is_on_floor(): velocity.y -= 20.0 * delta
 elif velocity.y < 0: velocity.y = -2
 if Input.is_key_pressed(KEY_SPACE) and is_on_floor() and not crouched: velocity.y = 6.0
 camera.fov = lerpf(camera.fov, 43.0 if Input.is_mouse_button_pressed(MOUSE_BUTTON_RIGHT) else 60.0, delta * 10.0)
 move_and_slide()

func damage(amount):
 health = maxf(0.0, health - amount)
 if health <= 0: game.defeat()
