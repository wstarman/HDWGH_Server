import { Character } from "./Character.js"
import type { StatusEffectResult } from "./Status.js";

export interface CharacterData {
	weaponid: string;
	statusid: string;
}

export interface BattleLog {
	time: number;
	attacker: number;
	receiver: number;
	damage: number;
	weaponName: string;
	damageType: string;
}

export class BattleManager{
 	Player: Character = new Character();
	Enemy: Character = new Character();
	BattleLog: BattleLog[] = [];
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
				this.record_attack(elapsedTime, 0, 1, this.Player, this.Enemy);
			}


			/*if(elapsedTime % this.Player.CurrentStatus.StatusCooldown == 0){
				const statusEffect = this.Player.CurrentStatus.StatusFunction(this.Player.CurrentStatus, this.Player, this.Enemy);
				this.record_status_effect(elapsedTime, 0, 1, statusEffect);
			}*/

			this.Player.CurrentStatus.forEach(status => {
				const statusEffect = status.process(this.Player, this.Enemy);
				
				this.record_status_effect(elapsedTime, 0, 1, statusEffect);
			});

				
			if(this.check_ending()){
				break;
			}
			
			if(elapsedTime % this.Enemy.WieldWeapon.WeaponCooldown == 0){
				this.record_attack(elapsedTime, 1, 0, this.Enemy, this.Player);
			}

			if(this.check_ending()){
				break;
			}
		}
	}

	record_attack(elapsedTime: number, attackerIndex: number, receiverIndex: number, attacker: Character, receiver: Character): void {
		const weapon = attacker.WieldWeapon;

		this.BattleLog.push({
			time: this.get_battle_time(elapsedTime),
			attacker: attackerIndex,
			receiver: receiverIndex,
			damage: weapon.WeaponDamage,
			weaponName: weapon.WeaponId,
			damageType: "physical",
		});

		attacker.NormalAttack(receiver);
	}

	record_status_effect(elapsedTime: number, statusHolderIndex: number, targetIndex: number, effect: StatusEffectResult | null): void {
		if(effect == null){
			return;
		}

		this.BattleLog.push({
			time: this.get_battle_time(elapsedTime),
			attacker: statusHolderIndex,
			receiver: effect.receiver == "statusHolder" ? statusHolderIndex : targetIndex,
			damage: effect.damage,
			weaponName: effect.sourceName,
			damageType: effect.damageType,
		});
	}

	get_battle_time(elapsedTime: number): number {
		return Number((elapsedTime * this.TickTime).toFixed(6));
	}

	check_ending(): boolean {
		if(this.Player.HP <= 0.0 || this.Enemy.HP <= 0.0){
			return true;
		}

		return false;
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
