import json, collections
STAT={1:'HP',2:'HP%',3:'ATK',4:'ATK%',5:'DEF',6:'DEF%',8:'SPD',9:'CRate',10:'CDmg',11:'RES',12:'ACC'}
SET={1:'Energy',2:'Guard',3:'Swift',4:'Blade',5:'Rage',6:'Focus',7:'Endure',8:'Fatal',10:'Despair',11:'Vampire',13:'Violent',14:'Nemesis',15:'Will',16:'Shield',17:'Revenge',18:'Destroy',19:'Fight',20:'Determination',21:'Enhance',22:'Accuracy',23:'Tolerance',24:'Seal',25:'Intangible',99:'Immemorial'}
MAX5={2:40,4:40,6:40,8:30,9:30,10:35,11:40,12:40,1:1875,3:100,5:100}
def load(p):
    d=json.load(open(p))
    units={u['unit_id']:u for u in d['unit_list']}
    runes=[]
    for r in d['runes']: r['_loc']='Inventory'; runes.append(r)
    for u in d['unit_list']:
        rs=u.get('runes',[])
        if isinstance(rs,dict): rs=list(rs.values())
        for r in rs: r['_loc']=u['unit_master_id']; r['_unit']=u; runes.append(r)
    return d,runes
def eff(r):
    s=1.0
    if r['prefix_eff'][0]: s+=r['prefix_eff'][1]/MAX5.get(r['prefix_eff'][0],40)
    for st,v,ench,gr in r['sec_eff']: s+=(v+gr)/MAX5.get(st,40)
    return s/2.8*100
def subs(r): return {STAT[st]:v+gr for st,v,e,gr in r['sec_eff']}
