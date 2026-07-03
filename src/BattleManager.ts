import { Character } from "./Character.js"

export interface CharacterData {
	weaponid: string;
	statusid: string;
}

export class BattleManager{
 	Player: Character = new Character();
	Enemy: Character = new Character();
	TickTime: number = 0.001

	currentTick: number = 0
	remainderTime: number = 0.0

	running: boolean = true

	constructor(player: CharacterData){
		this.Player = new Character(player.weaponid, player.statusid);
	}

	run(): void {
		let elapsedTime: number = 0

		while(true){
			elapsedTime++;

			if(elapsedTime % this.Player.WieldWeapon.WeaponCooldown == 0){
				this.Player.NormalAttack(this.Enemy);
			}

			if(elapsedTime % this.Player.CurrentStatus.StatusCooldown == 0){
				this.Player.CurrentStatus.StatusFunction(this.Player, this.Enemy);
			}

			//for Status in Player.CurrentStatus:
			//	Status.process(Player)
				
			if(this.check_ending()){
				break;
			}
			
			if(elapsedTime % this.Enemy.WieldWeapon.WeaponCooldown == 0){
				this.Enemy.NormalAttack(this.Player);
			}

			if(this.check_ending()){
				break;
			}
		}
	}

	check_ending(){
		if(this.Player.HP <= 0.0 || this.Enemy.HP <= 0.0){
			return true;
		}
	}
}

/*


func get_result() -> void:
	running = false
	if Enemy.HP <= 0.0:
		print("You Win")
	else:
		print("You Lose")
		
func _on_request_completed(result, response_code, headers, body):
	print(body.get_string_from_utf8())
	*/