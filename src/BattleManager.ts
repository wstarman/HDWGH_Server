import { Character } from "./Character.js"
import { DamageSystem, type DamageEvent } from "./Damage.js";
import { DamageType } from "./enum/DamageType.js";
import type { StatusContext, StatusEffectResult } from "./Status.js";

export interface CharacterData {
	weaponid: string;
	statusid: string[];
	passiveid: string[];
}

export interface BattleLog {
	time: number;
	eventType: string;
	sourceType: string;
	sourceObjectType: string;
	attacker: number;
	receiver: number;
	sourceId: string;
	equipmentSlot?: number;
	damage: number;
	damageType: string;
}

export class BattleManager{
 	Player: Character;
	Enemy: Character;
	BattleLog: BattleLog[] = [];
	TickTime: number = 0.001

	currentTick: number = 0
	remainderTime: number = 0.0

	elapsedTime: number = 0

	running: boolean = true

	constructor(player: CharacterData){
		this.Player = new Character(0, player.weaponid, player.statusid, player.passiveid);
		this.Enemy = new Character(1);
	}

	run(): void {

		let ctx: StatusContext = {
			holder: this.Player,
		}
		this.Player.onStart();
		this.Enemy.onStart();

		while(true){
			this.elapsedTime++;

			/*if(this.elapsedTime % this.Player.WieldWeapon.WeaponCooldown == 0){
				this.record_attack(elapsedTime, 0, 1, this.Player, this.Enemy);
			}*/

			

			// Checking OnTick Status
			this.Player.CurrentStatus.forEach(status => {
				const damageEvent = status.processOnTick(ctx);

				if (damageEvent){
					this.dealDamage(damageEvent);
				}
				
				//this.record_status_effect(elapsedTime, 0, 1, statusEffect);
			});

				
			if(this.check_ending()){
				break;
			}
			
			/*if(elapsedTime % this.Enemy.WieldWeapon.WeaponCooldown == 0){
				this.record_attack(elapsedTime, 1, 0, this.Enemy, this.Player);
			}*/

			if(this.check_ending()){
				break;
			}
		}
	}

	dealDamage(event: DamageEvent){
        let final = DamageSystem.deal(event);
	
		this.BattleLog.push({
			time: this.get_battle_time(this.elapsedTime),
			eventType: "damage",
			sourceType: event.sourceType,
			sourceObjectType: event.sourceObjectType,
			attacker: event.attacker.Index,
			receiver: event.receiver.Index,
			sourceId: event.sourceId,
			damage: final,
			damageType: event.type
		});
    }

	/*record_attack(elapsedTime: number, attackerIndex: number, receiverIndex: number, attacker: Character, receiver: Character): void {
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
	}*/

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
